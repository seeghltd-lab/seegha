import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import * as XLSX from 'xlsx';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── JSON ───────────────────────────────────────────

  async buildJsonExport(options: any, actor: { id: string; name: string; type: string }) {
    const groups: string[] = options.groups ?? [];
    const dateFrom = options.dateFrom ? new Date(options.dateFrom) : null;
    const dateTo   = options.dateTo   ? new Date(options.dateTo)   : null;
    const dateWhere = (dateFrom || dateTo)
      ? { createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {};

    const deletedFilter: string = options.deletedFilter ?? 'all';
    const softDeleteWhere =
      deletedFilter === 'only_deleted' ? { deletedAt: { not: null } } :
      deletedFilter === 'only_active'  ? { deletedAt: null } :
      {};

    const data: Record<string, any[]> = {
      permissions: [], admins: [], workerCategories: [], categories: [], units: [],
      suppliers: [], sites: [], employees: [], employeePermissions: [], siteEmployeeAccess: [],
      stocks: [], stockSuppliers: [], stockMigrations: [], stockHistory: [], stockOuts: [],
      requisitions: [], requisitionItems: [], receivingLogs: [], supplierPayments: [],
      siteWorkerRecords: [], siteExpenses: [], siteSettings: [], activityLogs: [], notifications: [],
    };
    const includes: string[] = ['workerCategories', 'categories', 'units', 'suppliers', 'sites', 'stocks', 'stockSuppliers'];

    // Core (always)
    data.workerCategories = await this.prisma.workerCategory.findMany({ orderBy: { createdAt: 'asc' } });
    data.categories = await this.prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
    data.units = await this.prisma.unit.findMany({ orderBy: { createdAt: 'asc' } });
    data.suppliers = await this.prisma.supplier.findMany({ orderBy: { createdAt: 'asc' } });
    data.sites = await this.prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
    data.stocks = await this.prisma.stock.findMany({ where: softDeleteWhere, orderBy: { createdAt: 'asc' } });
    data.stockSuppliers = await this.prisma.stockSupplier.findMany({ orderBy: { id: 'asc' } });

    if (groups.includes('admins')) {
      includes.push('admins');
      data.admins = await this.prisma.admin.findMany({ orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('employees')) {
      includes.push('permissions', 'employees', 'employeePermissions', 'siteEmployeeAccess');
      data.permissions = await this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
      data.employees = await this.prisma.employee.findMany({ where: softDeleteWhere, orderBy: { createdAt: 'asc' } });
      data.employeePermissions = await this.prisma.employeePermission.findMany({ orderBy: { createdAt: 'asc' } });
      data.siteEmployeeAccess = await this.prisma.siteEmployeeAccess.findMany({ orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('stockMovements')) {
      includes.push('stockHistory', 'stockMigrations', 'stockOuts');
      data.stockHistory = await this.prisma.stockHistory.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
      data.stockMigrations = await this.prisma.stockMigration.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
      data.stockOuts = await this.prisma.stockOut.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('requisitions')) {
      includes.push('requisitions', 'requisitionItems', 'receivingLogs', 'supplierPayments');
      data.requisitions = await this.prisma.requisition.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
      const reqIds = data.requisitions.map((r) => r.id);
      if (reqIds.length) {
        data.requisitionItems = await this.prisma.requisitionItem.findMany({ where: { requisitionId: { in: reqIds } }, orderBy: { createdAt: 'asc' } });
        const itemIds = data.requisitionItems.map((i) => i.id);
        if (itemIds.length) {
          data.receivingLogs = await this.prisma.receivingLog.findMany({ where: { requisitionItemId: { in: itemIds } }, orderBy: { receivedAt: 'asc' } });
        }
      }
      data.supplierPayments = await this.prisma.supplierPayment.findMany({ where: { ...(dateWhere as any) }, orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('siteOps')) {
      includes.push('siteWorkerRecords', 'siteExpenses');
      data.siteWorkerRecords = await this.prisma.siteWorkerRecord.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
      data.siteExpenses = await this.prisma.siteExpense.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('settings')) {
      includes.push('siteSettings');
      data.siteSettings = await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
    }

    if (groups.includes('activityLogs')) {
      includes.push('activityLogs');
      data.activityLogs = await this.prisma.activityLog.findMany({ where: dateWhere, orderBy: { createdAt: 'asc' } });
    }

    if (groups.includes('notifications')) {
      includes.push('notifications');
      data.notifications = await this.prisma.notification.findMany({ orderBy: { createdAt: 'asc' } });
    }

    const counts: Record<string, number> = {};
    for (const [key, arr] of Object.entries(data)) {
      if (arr.length) counts[key] = arr.length;
    }

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: { type: actor.type, id: actor.id, name: actor.name },
      projectName: 'amza_project',
      meta: {
        includes,
        dateFilter: { from: options.dateFrom ?? null, to: options.dateTo ?? null },
        deletedFilter,
        counts,
      },
      data,
    };
  }

  // ─── EXCEL ──────────────────────────────────────────

  async buildExcelExport(options: any): Promise<Buffer> {
    const groups: string[] = options.groups ?? [];
    const wb = XLSX.utils.book_new();

    // Stock (always)
    const stocks = await this.prisma.stock.findMany({
      include: { category: { select: { name: true } }, site: { select: { name: true } } },
      orderBy: { itemName: 'asc' },
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stocks.map((s) => ({
      SKU: s.sku, 'Item Name': s.itemName, Category: s.category?.name ?? '', Unit: s.unit,
      Quantity: s.quantity, 'Unit Cost': Number(s.unitCost), 'Total Value': Number(s.totalValue),
      'Reorder Level': s.reorderLevel, 'Stock Type': s.stockType, Site: s.site?.name ?? '',
      'Warehouse Location': s.warehouseLocation ?? '',
      'Received Date': s.receivedDate ? s.receivedDate.toISOString().split('T')[0] : '',
      'Expiry Date': s.expiryDate ? s.expiryDate.toISOString().split('T')[0] : '',
      Status: s.deletedAt ? 'Deleted' : 'Active',
    }))), 'Stock');

    // Suppliers (always)
    const suppliers = await this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suppliers.map((s) => ({
      Code: s.code, Name: s.name, 'Contact Person': s.contactPerson ?? '',
      Email: s.email ?? '', Phone: s.phone ?? '', Address: s.address ?? '',
      City: s.city ?? '', Country: s.country ?? '', Status: s.status,
      'Payment Terms': s.paymentTerms ?? '', Rating: s.rating ?? 0, Notes: s.notes ?? '',
    }))), 'Suppliers');

    // Categories (always)
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      categories.map((c) => ({ Name: c.name, Description: c.description ?? '' })),
    ), 'Categories');

    // Units (always)
    const units = await this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      units.map((u) => ({ Name: u.name })),
    ), 'Units');

    // Sites (always)
    const sites = await this.prisma.site.findMany({ orderBy: { name: 'asc' } });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sites.map((s) => ({
      Name: s.name, Location: s.location, Manager: s.managerName ?? '',
      Status: s.status, Budget: Number(s.budget),
      'Start Date': s.startDate ? s.startDate.toISOString().split('T')[0] : '',
      'End Date': s.endDate ? s.endDate.toISOString().split('T')[0] : '',
    }))), 'Sites');

    // WorkerCategories (always)
    const wcs = await this.prisma.workerCategory.findMany({ orderBy: { name: 'asc' } });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wcs.map((w) => ({ Name: w.name }))), 'Worker Categories');

    if (groups.includes('employees')) {
      const employees = await this.prisma.employee.findMany({ orderBy: { firstName: 'asc' } });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employees.map((e) => ({
        'First Name': e.firstName, 'Last Name': e.lastName, Email: e.email,
        Phone: e.phone, Position: e.position, Status: e.status,
        Locked: e.isLocked ? 'Yes' : 'No',
        'Soft-Deleted': e.deletedAt ? 'Yes' : 'No',
        'Created At': e.createdAt.toISOString().split('T')[0],
      }))), 'Employees');
    }

    if (groups.includes('stockMovements')) {
      const history = await this.prisma.stockHistory.findMany({
        include: { stock: { select: { sku: true, itemName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100000,
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(history.map((h) => ({
        SKU: h.stock.sku, 'Item Name': h.stock.itemName,
        'Movement Type': h.movementType, 'Qty Before': h.qtyBefore,
        'Qty Change': h.qtyChange, 'Qty After': h.qtyAfter,
        'Unit Price': h.unitPrice ? Number(h.unitPrice) : '',
        'By Admin': h.createdByAdminId ?? '', 'By Employee': h.createdByEmployeeId ?? '',
        Notes: h.notes ?? '', Date: h.createdAt.toISOString().split('T')[0],
      }))), 'Stock History');

      const migrations = await this.prisma.stockMigration.findMany({
        include: {
          stock: { select: { sku: true, itemName: true } },
          sourceSite: { select: { name: true } },
          destinationSite: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(migrations.map((m) => ({
        SKU: m.stock.sku, 'Item Name': m.stock.itemName,
        'From Site': m.sourceSite.name, 'To Site': m.destinationSite.name,
        Quantity: m.quantity, Unit: m.unit, Status: m.status,
        'Initiated By': m.initiatedByName ?? '',
        Date: m.createdAt.toISOString().split('T')[0],
      }))), 'Stock Migrations');

      const outs = await this.prisma.stockOut.findMany({
        include: {
          stock: { select: { sku: true, itemName: true } },
          site: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outs.map((o) => ({
        SKU: o.stock.sku, 'Item Name': o.stock.itemName, Site: o.site.name,
        Quantity: o.quantity, Unit: o.unit, Status: o.status,
        'Recorded By': o.recordedByName ?? '', Date: o.date.toISOString().split('T')[0],
      }))), 'Stock Outs');
    }

    if (groups.includes('requisitions')) {
      const reqs = await this.prisma.requisition.findMany({
        include: {
          employee: { select: { firstName: true, lastName: true } },
          supplier: { select: { name: true } },
          site: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqs.map((r) => ({
        Status: r.status,
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
        Supplier: r.supplier?.name ?? '', Site: r.site?.name ?? '',
        'Items Count': r._count.items, Description: r.description ?? '',
        'Created At': r.createdAt.toISOString().split('T')[0],
      }))), 'Requisitions');

      const payments = await this.prisma.supplierPayment.findMany({
        include: { supplier: { select: { name: true } }, stock: { select: { itemName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments.map((p) => ({
        Supplier: p.supplier.name, 'Item': p.stock?.itemName ?? '',
        Type: p.type, Amount: Number(p.amount), Status: p.status ?? '',
        'Paid Amount': Number(p.paidAmount), Reference: p.reference ?? '',
        Date: p.date.toISOString().split('T')[0],
      }))), 'Supplier Payments');
    }

    if (groups.includes('siteOps')) {
      const workerRecords = await this.prisma.siteWorkerRecord.findMany({
        include: { site: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: { date: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workerRecords.map((w) => ({
        Site: w.site.name, Date: w.date.toISOString().split('T')[0],
        Category: w.category?.name ?? '', 'Worker Count': w.workerCount,
        'Recorded By': w.recordedBy, Notes: w.notes ?? '',
      }))), 'Worker Records');

      const expenses = await this.prisma.siteExpense.findMany({
        include: { site: { select: { name: true } } },
        orderBy: { date: 'desc' },
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map((e) => ({
        Site: e.site.name, Description: e.description, Amount: Number(e.amount),
        Category: e.category ?? '', Date: e.date.toISOString().split('T')[0],
        Reference: e.reference ?? '', Notes: e.notes ?? '',
      }))), 'Site Expenses');
    }

    if (groups.includes('settings')) {
      const settings = await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settings.map((s) => ({
        Key: s.key, Value: s.value ?? '',
      }))), 'Site Settings');
    }

    if (groups.includes('admins')) {
      const admins = await this.prisma.admin.findMany({ orderBy: { names: 'asc' } });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(admins.map((a) => ({
        Name: a.names, Email: a.email, Phone: a.phone ?? '',
        Role: a.role, Locked: a.isLocked ? 'Yes' : 'No',
        'Created At': a.createdAt.toISOString().split('T')[0],
      }))), 'Admins');
    }

    if (groups.includes('activityLogs')) {
      const logs = await this.prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100000 });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map((l) => ({
        Action: l.action, 'Entity Type': l.entityType, 'Entity Label': l.entityLabel ?? '',
        'Performed By': l.performedByName ?? '', 'Performer Type': l.performedByType,
        'IP Address': l.ipAddress ?? '', Date: l.createdAt.toISOString().split('T')[0],
      }))), 'Activity Logs');
    }

    if (groups.includes('notifications')) {
      const notifs = await this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notifs.map((n) => ({
        Title: n.title, Message: n.message, 'Sender Type': n.senderType ?? '',
        Link: n.link ?? '', Date: n.createdAt.toISOString().split('T')[0],
      }))), 'Notifications');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── PDF ────────────────────────────────────────────

  async buildPdfExport(options: any): Promise<Buffer> {
    const groups: string[] = options.groups ?? [];
    const dateFrom = options.dateFrom ? new Date(options.dateFrom) : null;
    const dateTo   = options.dateTo   ? new Date(options.dateTo)   : null;
    const dateWhere = (dateFrom || dateTo)
      ? { createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {};

    const fmtRwf = (n: number) =>
      `RWF ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const [stocks, suppliers, sites, movements] = await Promise.all([
      this.prisma.stock.findMany({
        where: { deletedAt: null },
        include: { category: { select: { name: true } }, site: { select: { name: true } } },
        orderBy: { itemName: 'asc' },
      }),
      this.prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.site.findMany({ orderBy: { name: 'asc' } }),
      groups.includes('stockMovements')
        ? this.prisma.stockHistory.findMany({ where: dateWhere, orderBy: { createdAt: 'desc' }, take: 200 })
        : Promise.resolve([] as any[]),
    ]);

    let totalValue = 0, lowCount = 0, outCount = 0;
    for (const s of stocks) {
      const qty = s.quantity;
      const cost = Number(s.unitCost);
      totalValue += qty * cost;
      if (qty === 0) outCount++;
      else if (qty <= s.reorderLevel) lowCount++;
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ── Cover ──
      doc.fontSize(26).font('Helvetica-Bold').text('AMZA Project', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Data Export Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${dateStr}`, { align: 'center' });
      doc.fillColor('#000').moveDown(2);

      // ── Inventory KPIs ──
      doc.fontSize(14).font('Helvetica-Bold').text('Inventory Summary');
      doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + pageWidth, doc.y + 4).stroke('#ccc');
      doc.moveDown(0.8);
      doc.fontSize(10).font('Helvetica');
      const kpis = [
        ['Total Active SKUs', String(stocks.length)],
        ['Total Inventory Value', fmtRwf(totalValue)],
        ['Low Stock Items', String(lowCount)],
        ['Out of Stock Items', String(outCount)],
        ['Total Sites', String(sites.length)],
        ['Total Suppliers', String(suppliers.length)],
      ];
      for (const [label, value] of kpis) {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value);
      }
      doc.moveDown(2);

      // ── Stock Table ──
      doc.fontSize(14).font('Helvetica-Bold').text('Stock List');
      doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + pageWidth, doc.y + 4).stroke('#ccc');
      doc.moveDown(0.8);

      const colW = [65, 130, 70, 40, 40, 60, 70, 60];
      const headers = ['SKU', 'Item Name', 'Category', 'Unit', 'Qty', 'Cost (RWF)', 'Total Val', 'Site'];
      let x = doc.page.margins.left;
      const headerY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#444');
      headers.forEach((h, i) => {
        doc.text(h, x, headerY, { width: colW[i], align: i >= 4 ? 'right' : 'left' });
        x += colW[i];
      });
      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke('#ddd');
      doc.fillColor('#000');

      const displayStocks = stocks.slice(0, 150);
      doc.font('Helvetica').fontSize(7.5);
      for (const s of displayStocks) {
        if (doc.y > doc.page.height - 80) { doc.addPage(); doc.y = doc.page.margins.top; }
        x = doc.page.margins.left;
        const rowY = doc.y;
        const row = [
          s.sku, s.itemName, s.category?.name ?? '', s.unit,
          String(s.quantity),
          Number(s.unitCost).toLocaleString('en-US'),
          Number(s.totalValue).toLocaleString('en-US'),
          s.site?.name ?? '',
        ];
        row.forEach((cell, i) => {
          const clamp = cell.length > 16 ? cell.slice(0, 15) + '…' : cell;
          doc.text(clamp, x, rowY, { width: colW[i], align: i >= 4 ? 'right' : 'left' });
          x += colW[i];
        });
        doc.y = rowY + 13;
      }
      if (stocks.length > 150) {
        doc.moveDown(0.5).font('Helvetica-Oblique').fontSize(8).fillColor('#888')
          .text(`… and ${stocks.length - 150} more items. Use JSON or Excel export for the full list.`);
        doc.fillColor('#000');
      }

      // ── Supplier Directory ──
      if (suppliers.length) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Supplier Directory');
        doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + pageWidth, doc.y + 4).stroke('#ccc');
        doc.moveDown(0.8);
        for (const s of suppliers) {
          if (doc.y > doc.page.height - 100) doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold').text(`${s.name}  `, { continued: true })
            .font('Helvetica').fontSize(9).fillColor('#666').text(`(${s.code}) — ${s.status}`).fillColor('#000');
          doc.fontSize(9).font('Helvetica');
          if (s.contactPerson) doc.text(`Contact: ${s.contactPerson}`);
          if (s.email) doc.text(`Email: ${s.email}`);
          if (s.phone) doc.text(`Phone: ${s.phone}`);
          if (s.address) doc.text(`Address: ${s.address}`);
          doc.moveDown(0.6);
        }
      }

      // ── Stock Movements Summary ──
      if (movements.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Stock Movements Summary');
        doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + pageWidth, doc.y + 4).stroke('#ccc');
        doc.moveDown(0.8);

        const mvKpis = [
          ['Total Movement Records', String(movements.length)],
          ['IN movements', String(movements.filter((m: any) => m.movementType === 'IN').length)],
          ['OUT movements', String(movements.filter((m: any) => m.movementType === 'OUT').length)],
          ['ADJUSTMENT movements', String(movements.filter((m: any) => m.movementType === 'ADJUSTMENT').length)],
        ];
        if (dateFrom || dateTo) {
          mvKpis.push(['Date Range', `${dateFrom ? dateFrom.toISOString().split('T')[0] : '—'} → ${dateTo ? dateTo.toISOString().split('T')[0] : '—'}`]);
        }
        for (const [label, value] of mvKpis) {
          doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value);
        }
        doc.moveDown(1);

        const recent30 = movements.slice(0, 30);
        doc.fontSize(11).font('Helvetica-Bold').text('Recent Movements');
        doc.moveDown(0.4);
        const mColW = [80, 110, 90, 55, 55, 55, 55];
        const mHeaders = ['Date', 'Stock ID', 'Type', 'Before', 'Change', 'After', 'Price'];
        let mx = doc.page.margins.left;
        const mHeaderY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#444');
        mHeaders.forEach((h, i) => {
          doc.text(h, mx, mHeaderY, { width: mColW[i], align: i >= 3 ? 'right' : 'left' });
          mx += mColW[i];
        });
        doc.moveDown(0.4);
        doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke('#ddd');
        doc.fillColor('#000').font('Helvetica').fontSize(7.5);
        for (const mv of recent30) {
          if (doc.y > doc.page.height - 80) doc.addPage();
          mx = doc.page.margins.left;
          const mry = doc.y;
          const mcells = [
            mv.createdAt.toISOString().split('T')[0],
            mv.stockId.slice(-8),
            mv.movementType,
            String(mv.qtyBefore), String(mv.qtyChange), String(mv.qtyAfter),
            mv.unitPrice ? Number(mv.unitPrice).toLocaleString('en-US') : '—',
          ];
          mcells.forEach((cell, i) => {
            doc.text(cell, mx, mry, { width: mColW[i], align: i >= 3 ? 'right' : 'left' });
            mx += mColW[i];
          });
          doc.y = mry + 13;
        }
      }

      doc.end();
    });
  }
}
