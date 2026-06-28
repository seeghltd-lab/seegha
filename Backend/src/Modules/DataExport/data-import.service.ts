import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import * as XLSX from 'xlsx';

export interface ImportResult {
  entity: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: string[];
}

interface ExistingKeys {
  adminEmails: Set<string>;
  adminIds: Set<string>;
  employeeEmails: Set<string>;
  employeeIds: Set<string>;
  deletedEmployeeEmails: Set<string>;
  permissionNames: Set<string>;
  permissionIds: Set<string>;
  empPermPairs: Set<string>;
  workerCategoryIds: Set<string>;
  workerCategoryNames: Set<string>;
  categoryIds: Set<string>;
  unitIds: Set<string>;
  supplierCodes: Set<string>;
  supplierIds: Set<string>;
  siteIds: Set<string>;
  stockSkus: Set<string>;
  stockIds: Set<string>;
  deletedStockSkus: Set<string>;
  stockSupplierPairs: Set<string>;
  siteAccessPairs: Set<string>;
  stockMigrationIds: Set<string>;
  stockHistoryIds: Set<string>;
  stockOutIds: Set<string>;
  requisitionIds: Set<string>;
  requisitionItemIds: Set<string>;
  receivingLogIds: Set<string>;
  supplierPaymentIds: Set<string>;
  siteWorkerRecordIds: Set<string>;
  siteExpenseIds: Set<string>;
  siteSettingKeys: Set<string>;
  activityLogIds: Set<string>;
  notificationIds: Set<string>;
}

const BATCH = 500;

async function batchCreate(
  createMany: (data: any[]) => Promise<{ count: number }>,
  data: any[],
): Promise<number> {
  let total = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const result = await createMany(data.slice(i, i + BATCH));
    total += result.count;
  }
  return total;
}

@Injectable()
export class DataImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Preview ─────────────────────────────────────────

  async preview(payload: any, strategy: string = 'SKIP', groups?: string[]) {
    this.validate(payload);
    const d = payload.data;
    const e = await this.loadExisting();
    const warnings = this.buildWarnings(payload, strategy);

    const wouldCreate: Record<string, number> = {};
    const wouldUpdate: Record<string, number> = {};
    const wouldSkip: Record<string, number> = {};

    const isOW = strategy === 'OVERWRITE';
    const isRD = strategy === 'RESTORE_DELETED';
    const hasGroup = (g: string) => !groups || groups.includes(g);

    const check = (key: string, items: any[], isNew: (i: any) => boolean) => {
      const arr = items ?? [];
      const nc = arr.filter(isNew).length;
      const ex = arr.length - nc;
      wouldCreate[key] = nc;
      wouldUpdate[key] = isOW ? ex : 0;
      wouldSkip[key] = isOW ? 0 : ex;
    };

    const checkSD = (key: string, items: any[], allKeys: Set<string>, deletedKeys: Set<string>, getKey: (i: any) => string) => {
      const arr = items ?? [];
      const nc = arr.filter((i) => !allKeys.has(getKey(i))).length;
      const dc = arr.filter((i) => deletedKeys.has(getKey(i))).length;
      const ac = arr.filter((i) => allKeys.has(getKey(i)) && !deletedKeys.has(getKey(i))).length;
      if (isRD) { wouldCreate[key] = nc; wouldUpdate[key] = dc; wouldSkip[key] = ac; }
      else       { wouldCreate[key] = nc; wouldUpdate[key] = isOW ? dc + ac : 0; wouldSkip[key] = isOW ? 0 : dc + ac; }
    };

    if (hasGroup('admins'))    check('admins', d.admins, (a) => !e.adminEmails.has(a.email));
    if (hasGroup('employees')) {
      check('permissions', d.permissions, (p) => !e.permissionNames.has(p.name));
      checkSD('employees', d.employees, e.employeeEmails, e.deletedEmployeeEmails, (emp) => emp.email);
      const epArr = d.employeePermissions ?? [];
      const epNew = epArr.filter((ep: any) => e.employeeIds.has(ep.employeeId) && e.permissionIds.has(ep.permissionId) && !e.empPermPairs.has(`${ep.employeeId}:${ep.permissionId}`)).length;
      wouldCreate['employeePermissions'] = epNew; wouldSkip['employeePermissions'] = epArr.length - epNew; wouldUpdate['employeePermissions'] = 0;
      const saArr = d.siteEmployeeAccess ?? [];
      const saNew = saArr.filter((a: any) => e.siteIds.has(a.siteId) && e.employeeIds.has(a.employeeId) && !e.siteAccessPairs.has(`${a.siteId}:${a.employeeId}`)).length;
      wouldCreate['siteEmployeeAccess'] = saNew; wouldSkip['siteEmployeeAccess'] = saArr.length - saNew; wouldUpdate['siteEmployeeAccess'] = 0;
    }

    check('workerCategories', d.workerCategories, (w) => !e.workerCategoryNames.has(w.name));
    check('categories', d.categories, (c) => !e.categoryIds.has(c.id));
    check('units', d.units, (u) => !e.unitIds.has(u.id));
    check('suppliers', d.suppliers, (s) => !e.supplierCodes.has(s.code));
    check('sites', d.sites, (s) => !e.siteIds.has(s.id));
    checkSD('stocks', d.stocks, e.stockSkus, e.deletedStockSkus, (s) => s.sku);
    const ssArr = d.stockSuppliers ?? [];
    const ssNew = ssArr.filter((ss: any) => e.stockIds.has(ss.stockId) && e.supplierIds.has(ss.supplierId) && !e.stockSupplierPairs.has(`${ss.stockId}:${ss.supplierId}`)).length;
    wouldCreate['stockSuppliers'] = ssNew; wouldSkip['stockSuppliers'] = ssArr.length - ssNew; wouldUpdate['stockSuppliers'] = 0;

    if (hasGroup('stockMovements')) {
      const smArr = d.stockMigrations ?? [];
      wouldCreate['stockMigrations'] = smArr.filter((m: any) => !e.stockMigrationIds.has(m.id)).length;
      wouldSkip['stockMigrations']   = smArr.length - wouldCreate['stockMigrations'];
      wouldUpdate['stockMigrations'] = 0;
      const shArr = d.stockHistory ?? [];
      const shNew = shArr.filter((h: any) => e.stockIds.has(h.stockId) && !e.stockHistoryIds.has(h.id)).length;
      wouldCreate['stockHistory'] = shNew; wouldSkip['stockHistory'] = shArr.length - shNew; wouldUpdate['stockHistory'] = 0;
      const soArr = d.stockOuts ?? [];
      const soNew = soArr.filter((o: any) => e.siteIds.has(o.siteId) && e.stockIds.has(o.stockId) && !e.stockOutIds.has(o.id)).length;
      wouldCreate['stockOuts'] = soNew; wouldSkip['stockOuts'] = soArr.length - soNew; wouldUpdate['stockOuts'] = 0;
    }

    if (hasGroup('requisitions')) {
      check('requisitions', d.requisitions, (r) => !e.requisitionIds.has(r.id));
      const riArr = d.requisitionItems ?? [];
      const riNew = riArr.filter((i: any) => e.requisitionIds.has(i.requisitionId) && !e.requisitionItemIds.has(i.id)).length;
      wouldCreate['requisitionItems'] = riNew; wouldSkip['requisitionItems'] = riArr.length - riNew; wouldUpdate['requisitionItems'] = 0;
      const rlArr = d.receivingLogs ?? [];
      const rlNew = rlArr.filter((l: any) => e.requisitionItemIds.has(l.requisitionItemId) && !e.receivingLogIds.has(l.id)).length;
      wouldCreate['receivingLogs'] = rlNew; wouldSkip['receivingLogs'] = rlArr.length - rlNew; wouldUpdate['receivingLogs'] = 0;
      const spArr = d.supplierPayments ?? [];
      const spNew = spArr.filter((p: any) => e.supplierIds.has(p.supplierId) && !e.supplierPaymentIds.has(p.id)).length;
      wouldCreate['supplierPayments'] = spNew; wouldSkip['supplierPayments'] = spArr.length - spNew; wouldUpdate['supplierPayments'] = 0;
    }

    if (hasGroup('siteOps')) {
      const wrArr = d.siteWorkerRecords ?? [];
      const wrNew = wrArr.filter((w: any) => e.siteIds.has(w.siteId) && !e.siteWorkerRecordIds.has(w.id)).length;
      wouldCreate['siteWorkerRecords'] = wrNew; wouldSkip['siteWorkerRecords'] = wrArr.length - wrNew; wouldUpdate['siteWorkerRecords'] = 0;
      const seArr = d.siteExpenses ?? [];
      const seNew = seArr.filter((ex: any) => e.siteIds.has(ex.siteId) && !e.siteExpenseIds.has(ex.id)).length;
      wouldCreate['siteExpenses'] = seNew; wouldSkip['siteExpenses'] = seArr.length - seNew; wouldUpdate['siteExpenses'] = 0;
    }

    if (hasGroup('settings')) check('siteSettings', d.siteSettings, (s) => !e.siteSettingKeys.has(s.key));
    if (hasGroup('activityLogs'))  check('activityLogs',  d.activityLogs,  (l) => !e.activityLogIds.has(l.id));
    if (hasGroup('notifications')) check('notifications', d.notifications, (n) => !e.notificationIds.has(n.id));

    // Which groups have data in the file
    const detectedGroups: string[] = [];
    if ((d.admins?.length ?? 0) > 0) detectedGroups.push('admins');
    if ((d.employees?.length ?? 0) > 0 || (d.permissions?.length ?? 0) > 0) detectedGroups.push('employees');
    if ((d.stockHistory?.length ?? 0) > 0 || (d.stockMigrations?.length ?? 0) > 0 || (d.stockOuts?.length ?? 0) > 0) detectedGroups.push('stockMovements');
    if ((d.requisitions?.length ?? 0) > 0) detectedGroups.push('requisitions');
    if ((d.siteWorkerRecords?.length ?? 0) > 0 || (d.siteExpenses?.length ?? 0) > 0) detectedGroups.push('siteOps');
    if ((d.siteSettings?.length ?? 0) > 0) detectedGroups.push('settings');
    if ((d.activityLogs?.length ?? 0) > 0) detectedGroups.push('activityLogs');
    if ((d.notifications?.length ?? 0) > 0) detectedGroups.push('notifications');

    return {
      exportedAt: payload.exportedAt ?? null,
      exportedBy: payload.exportedBy ?? null,
      projectName: payload.projectName ?? null,
      includes: payload.meta?.includes ?? [],
      counts: payload.meta?.counts ?? {},
      strategy, warnings, wouldCreate, wouldUpdate, wouldSkip, detectedGroups,
    };
  }

  // ─── Commit ──────────────────────────────────────────

  async commit(
    payload: any,
    options: { conflictStrategy: string; groups?: string[] },
    actor?: { id: string; name: string; fileName?: string },
  ): Promise<ImportResult[]> {
    this.validate(payload);
    const d = payload.data;
    const strategy = options.conflictStrategy ?? 'SKIP';
    const groups = options.groups;
    const e = await this.loadExisting();
    const results: ImportResult[] = [];
    const hasGroup = (g: string) => !groups || groups.includes(g);

    if (strategy === 'ABORT_ON_CONFLICT') {
      const conflicts = this.detectConflicts(d, e);
      if (conflicts.length) throw new BadRequestException({ message: 'Import aborted: conflicts detected', conflicts });
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. permissions
      if (d.permissions?.length && hasGroup('employees'))      results.push(await this.importPermissions(d.permissions, e, strategy, tx));
      // 2. admins
      if (d.admins?.length && hasGroup('admins'))              results.push(await this.importAdmins(d.admins, e, strategy, tx));
      // 3. workerCategories
      if (d.workerCategories?.length)                          results.push(await this.importWorkerCategories(d.workerCategories, e, strategy, tx));
      // 4. categories
      if (d.categories?.length)                                results.push(await this.importCategories(d.categories, e, strategy, tx));
      // 5. units
      if (d.units?.length)                                     results.push(await this.importUnits(d.units, e, strategy, tx));
      // 6. suppliers
      if (d.suppliers?.length)                                 results.push(await this.importSuppliers(d.suppliers, e, strategy, tx));
      // 7. sites
      if (d.sites?.length)                                     results.push(await this.importSites(d.sites, e, strategy, tx));
      // 8. employees
      if (d.employees?.length && hasGroup('employees'))        results.push(await this.importEmployees(d.employees, e, strategy, tx));
      // 9. employeePermissions
      if (d.employeePermissions?.length && hasGroup('employees')) results.push(await this.importEmployeePermissions(d.employeePermissions, e, tx));
      // 10. siteEmployeeAccess
      if (d.siteEmployeeAccess?.length && hasGroup('employees'))  results.push(await this.importSiteEmployeeAccess(d.siteEmployeeAccess, e, tx));
      // 11. stocks
      if (d.stocks?.length)                                    results.push(await this.importStocks(d.stocks, e, strategy, actor, tx));
      // 12. stockSuppliers
      if (d.stockSuppliers?.length)                            results.push(await this.importStockSuppliers(d.stockSuppliers, e, tx));
      // 13. stockMigrations (before stockHistory)
      if (d.stockMigrations?.length && hasGroup('stockMovements')) results.push(await this.importStockMigrations(d.stockMigrations, e, tx));
      // 14. stockHistory
      if (d.stockHistory?.length && hasGroup('stockMovements'))    results.push(await this.importStockHistory(d.stockHistory, e, tx));
      // 15. stockOuts
      if (d.stockOuts?.length && hasGroup('stockMovements'))       results.push(await this.importStockOuts(d.stockOuts, e, tx));
      // 16. requisitions
      if (d.requisitions?.length && hasGroup('requisitions'))      results.push(await this.importRequisitions(d.requisitions, e, tx));
      // 17. requisitionItems
      if (d.requisitionItems?.length && hasGroup('requisitions'))  results.push(await this.importRequisitionItems(d.requisitionItems, e, tx));
      // 18. receivingLogs
      if (d.receivingLogs?.length && hasGroup('requisitions'))     results.push(await this.importReceivingLogs(d.receivingLogs, e, tx));
      // 19. supplierPayments
      if (d.supplierPayments?.length && hasGroup('requisitions'))  results.push(await this.importSupplierPayments(d.supplierPayments, e, tx));
      // 20. siteWorkerRecords
      if (d.siteWorkerRecords?.length && hasGroup('siteOps'))      results.push(await this.importSiteWorkerRecords(d.siteWorkerRecords, e, tx));
      // 21. siteExpenses
      if (d.siteExpenses?.length && hasGroup('siteOps'))           results.push(await this.importSiteExpenses(d.siteExpenses, e, tx));
      // 22. siteSettings
      if (d.siteSettings?.length && hasGroup('settings'))          results.push(await this.importSiteSettings(d.siteSettings, e, tx));
      // 23. activityLogs
      if (d.activityLogs?.length && hasGroup('activityLogs'))      results.push(await this.importActivityLogs(d.activityLogs, e, tx));
      // 24. notifications
      if (d.notifications?.length && hasGroup('notifications'))    results.push(await this.importNotifications(d.notifications, e, tx));
    }, { timeout: 120000, maxWait: 30000 });

    // Collect created IDs for rollback snapshot
    const createdIds: Record<string, string[]> = {};
    const col = (key: string, arr: any[], existingSet: Set<string>) => {
      const ids = (arr ?? []).filter((x) => x?.id && !existingSet.has(x.id)).map((x) => x.id);
      if (ids.length) createdIds[key] = ids;
    };
    if (hasGroup('employees')) { col('permissions', d.permissions, e.permissionIds); col('employees', d.employees, e.employeeIds); }
    if (hasGroup('admins'))      col('admins', d.admins, e.adminIds);
    col('workerCategories', d.workerCategories, e.workerCategoryIds);
    col('categories', d.categories, e.categoryIds);
    col('units', d.units, e.unitIds);
    col('suppliers', d.suppliers, e.supplierIds);
    col('sites', d.sites, e.siteIds);
    col('stocks', d.stocks, e.stockIds);
    if (hasGroup('stockMovements')) {
      col('stockMigrations', d.stockMigrations, e.stockMigrationIds);
      col('stockHistory',    d.stockHistory,    e.stockHistoryIds);
      col('stockOuts',       d.stockOuts,       e.stockOutIds);
    }
    if (hasGroup('requisitions')) {
      col('requisitions',     d.requisitions,     e.requisitionIds);
      col('requisitionItems', d.requisitionItems, e.requisitionItemIds);
      col('receivingLogs',    d.receivingLogs,    e.receivingLogIds);
      col('supplierPayments', d.supplierPayments, e.supplierPaymentIds);
    }
    if (hasGroup('siteOps')) {
      col('siteWorkerRecords', d.siteWorkerRecords, e.siteWorkerRecordIds);
      col('siteExpenses',      d.siteExpenses,      e.siteExpenseIds);
    }
    if (hasGroup('activityLogs'))  col('activityLogs',  d.activityLogs,  e.activityLogIds);
    if (hasGroup('notifications')) col('notifications', d.notifications, e.notificationIds);

    if (actor) {
      const summary = results.reduce(
        (acc, r) => ({ created: acc.created + r.created, updated: acc.updated + r.updated, skipped: acc.skipped + r.skipped, failed: acc.failed + r.failed }),
        { created: 0, updated: 0, skipped: 0, failed: 0 },
      );
      await this.prisma.importSnapshot.create({
        data: {
          performedById: actor.id, performedByName: actor.name,
          fileName: actor.fileName ?? 'backup.json', strategy,
          groups: groups ? (groups as any) : undefined,
          summary, createdIds, status: 'active',
        },
      });
    }

    return results;
  }

  // ─── Rollback ────────────────────────────────────────

  async listSnapshots(): Promise<any[]> {
    return this.prisma.importSnapshot.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async rollback(snapshotId: string, actor: { id: string; name: string }): Promise<void> {
    const snapshot = await this.prisma.importSnapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot) throw new BadRequestException('Import snapshot not found');
    if (snapshot.status === 'rolled_back') throw new BadRequestException('This import has already been rolled back');

    const ids = snapshot.createdIds as Record<string, string[]>;
    const del = async (tx: any, model: any, idList?: string[]) => {
      if (idList?.length) await model.deleteMany({ where: { id: { in: idList } } });
    };

    await this.prisma.$transaction(async (tx) => {
      await del(tx, tx.notification,       ids.notifications);
      await del(tx, tx.activityLog,        ids.activityLogs);
      await del(tx, tx.siteSetting,        ids.siteSettings);
      await del(tx, tx.siteExpense,        ids.siteExpenses);
      await del(tx, tx.siteWorkerRecord,   ids.siteWorkerRecords);
      await del(tx, tx.supplierPayment,    ids.supplierPayments);
      await del(tx, tx.receivingLog,       ids.receivingLogs);
      await del(tx, tx.requisitionItem,    ids.requisitionItems);
      await del(tx, tx.requisition,        ids.requisitions);
      await del(tx, tx.stockOut,           ids.stockOuts);
      await del(tx, tx.stockHistory,       ids.stockHistory);
      await del(tx, tx.stockMigration,     ids.stockMigrations);
      await del(tx, tx.stockSupplier,      ids.stockSuppliers);
      await del(tx, tx.stock,              ids.stocks);
      // siteEmployeeAccess cascades from site + employee
      if (ids.employees?.length) await tx.siteEmployeeAccess.deleteMany({ where: { employeeId: { in: ids.employees } } });
      await del(tx, tx.employee,           ids.employees);
      await del(tx, tx.site,               ids.sites);
      await del(tx, tx.supplier,           ids.suppliers);
      await del(tx, tx.unit,               ids.units);
      await del(tx, tx.category,           ids.categories);
      await del(tx, tx.workerCategory,     ids.workerCategories);
      await del(tx, tx.admin,              ids.admins);
      await del(tx, tx.permission,         ids.permissions);
    }, { timeout: 60000 });

    await this.prisma.importSnapshot.update({
      where: { id: snapshotId },
      data: { status: 'rolled_back', rolledBackAt: new Date(), rolledBackById: actor.id, rolledBackByName: actor.name },
    });
  }

  // ─── CSV / Excel Stock Preview ────────────────────────

  async previewStockFromCsv(file: Express.Multer.File): Promise<any> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      throw new BadRequestException('Only .csv and .xlsx files are accepted');
    }

    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) {
      return { total: 0, newCount: 0, existsCount: 0, invalidCount: 0, rows: [] };
    }

    const normalKey = (k: string) => k.trim().replace(/\s+/g, '').toLowerCase();
    const sampleKeys = Object.keys(rows[0]).map(normalKey);
    if (!sampleKeys.includes('sku') || !sampleKeys.includes('itemname')) {
      throw new BadRequestException('File must have columns: sku, itemName (or "Item Name")');
    }

    const allSkus = await this.prisma.stock.findMany({ select: { sku: true } });
    const skuSet = new Set(allSkus.map((s) => s.sku));

    const previewRows: any[] = [];
    for (const rawRow of rows) {
      const row: any = {};
      for (const [k, v] of Object.entries(rawRow)) row[normalKey(k)] = v;

      const sku = String(row.sku ?? '').trim();
      const itemName = String(row.itemname ?? '').trim();

      let status: 'new' | 'exists' | 'invalid' = 'new';
      let reason: string | undefined;

      if (!sku || !itemName) {
        status = 'invalid';
        reason = !sku ? 'Missing SKU' : 'Missing item name';
      } else if (skuSet.has(sku)) {
        status = 'exists';
      }

      previewRows.push({
        sku, itemName,
        unit: String(row.unit ?? '').trim(),
        quantity: Math.round(Number(row.quantity) || 0),
        unitCost: Number(row.unitcost) || 0,
        reorderLevel: Math.round(Number(row.reorderlevel) || 5),
        stockType: String(row.stocktype ?? 'MATERIAL').toUpperCase(),
        categoryName: String(row.categoryname ?? '').trim(),
        warehouseLocation: String(row.warehouselocation ?? '').trim(),
        status, reason,
      });
    }

    return {
      total: previewRows.length,
      newCount:     previewRows.filter((r) => r.status === 'new').length,
      existsCount:  previewRows.filter((r) => r.status === 'exists').length,
      invalidCount: previewRows.filter((r) => r.status === 'invalid').length,
      rows: previewRows,
    };
  }

  // ─── CSV / Excel Stock Import ─────────────────────────

  async importStockFromCsv(file: Express.Multer.File, actor?: { id: string }): Promise<ImportResult> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      throw new BadRequestException('Only .csv and .xlsx files are accepted');
    }

    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const result: ImportResult = {
      entity: 'Stocks (CSV)', total: rows.length,
      created: 0, updated: 0, skipped: 0, failed: 0, warnings: [],
    };

    if (rows.length === 0) {
      result.warnings.push('File contains no data rows');
      return result;
    }

    const normalKey = (k: string) => k.trim().replace(/\s+/g, '').toLowerCase();
    const sampleKeys = Object.keys(rows[0]).map(normalKey);
    if (!sampleKeys.includes('sku') || !sampleKeys.includes('itemname')) {
      throw new BadRequestException('File must have columns: sku, itemName (or "Item Name")');
    }

    const categoryCache = new Map<string, string>();
    const adminId = actor?.id ?? 'system';

    for (const rawRow of rows) {
      const row: any = {};
      for (const [k, v] of Object.entries(rawRow)) row[normalKey(k)] = v;

      const sku = String(row.sku ?? '').trim();
      const itemName = String(row.itemname ?? '').trim();

      if (!sku || !itemName) {
        result.warnings.push(`Row skipped: missing sku or itemName`);
        result.failed++;
        continue;
      }

      // Category lookup / create
      let categoryId: string | null = null;
      const catName = String(row.categoryname ?? '').trim();
      if (catName) {
        if (!categoryCache.has(catName)) {
          let cat = await this.prisma.category.findFirst({ where: { name: catName } });
          if (!cat) cat = await this.prisma.category.create({ data: { name: catName, adminId } });
          categoryCache.set(catName, cat.id);
        }
        categoryId = categoryCache.get(catName) ?? null;
      }

      const existing = await this.prisma.stock.findUnique({ where: { sku } });
      if (existing) { result.skipped++; continue; }

      const qty = Math.round(Number(row.quantity) || 0);
      const cost = Number(row.unitcost) || 0;

      try {
        await this.prisma.stock.create({
          data: {
            sku, itemName,
            unit: String(row.unit ?? 'pcs').trim(),
            quantity: qty,
            unitCost: cost,
            totalValue: qty * cost,
            reorderLevel: Math.round(Number(row.reorderlevel) || 5),
            stockType: (['MATERIAL', 'EQUIPMENT'].includes(String(row.stocktype ?? '').toUpperCase()))
              ? (String(row.stocktype).toUpperCase() as any)
              : 'MATERIAL',
            warehouseLocation: String(row.warehouselocation ?? '').trim() || null,
            categoryId,
            adminId,
            receivedDate: new Date(),
          },
        });
        result.created++;
      } catch (err) {
        result.failed++;
        result.warnings.push(`Row "${sku}" failed: ${(err as any).message}`);
      }
    }

    return result;
  }

  // ─── Entity Importers ─────────────────────────────────

  private async importPermissions(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((p) => !e.permissionNames.has(p.name));
    const existingItems = items.filter((p) => e.permissionNames.has(p.name));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.permission.createMany({
        data: data.map((p) => ({ id: p.id, name: p.name, description: p.description ?? null, createdAt: new Date(p.createdAt) })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((p) => { e.permissionIds.add(p.id); e.permissionNames.add(p.name); });

    if (strategy === 'OVERWRITE') {
      for (const p of existingItems) {
        await tx.permission.update({ where: { name: p.name }, data: { description: p.description ?? null } });
        updated++;
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Permissions', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importAdmins(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((a) => !e.adminEmails.has(a.email));
    const existingItems = items.filter((a) => e.adminEmails.has(a.email));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.admin.createMany({
        data: data.map((a) => ({
          id: a.id, names: a.names, email: a.email, password: a.password,
          phone: a.phone ?? null, profilePicture: a.profilePicture ?? null,
          isLocked: a.isLocked ?? false, role: a.role ?? 'ADMIN',
          createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((a) => { e.adminIds.add(a.id); e.adminEmails.add(a.email); });

    if (strategy === 'OVERWRITE') {
      for (const a of existingItems) {
        await tx.admin.update({
          where: { email: a.email },
          data: { names: a.names, phone: a.phone ?? null, isLocked: a.isLocked ?? false, role: a.role ?? 'ADMIN', updatedAt: new Date(a.updatedAt) },
        });
        updated++;
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Admins', total: items.length, created, updated, skipped, failed: 0, warnings: ['Passwords restored as-is (already hashed)'] };
  }

  private async importWorkerCategories(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((w) => !e.workerCategoryNames.has(w.name));
    const existingItems = items.filter((w) => e.workerCategoryNames.has(w.name));

    const created = await batchCreate(
      (data) => tx.workerCategory.createMany({
        data: data.map((w) => ({ id: w.id, name: w.name, adminId: w.adminId ?? null, createdAt: new Date(w.createdAt) })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((w) => { e.workerCategoryIds.add(w.id); e.workerCategoryNames.add(w.name); });

    const updated = strategy === 'OVERWRITE' ? existingItems.length : 0;
    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Worker Categories', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importCategories(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((c) => !e.categoryIds.has(c.id));
    const existingItems = items.filter((c) => e.categoryIds.has(c.id));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.category.createMany({
        data: data.map((c) => ({
          id: c.id, name: c.name, description: c.description ?? null,
          adminId: c.adminId ?? null, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((c) => e.categoryIds.add(c.id));

    if (strategy === 'OVERWRITE') {
      for (const c of existingItems) {
        await tx.category.update({ where: { id: c.id }, data: { name: c.name, description: c.description ?? null, updatedAt: new Date(c.updatedAt) } });
        updated++;
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Categories', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importUnits(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((u) => !e.unitIds.has(u.id));
    const existingItems = items.filter((u) => e.unitIds.has(u.id));

    const created = await batchCreate(
      (data) => tx.unit.createMany({
        data: data.map((u) => ({
          id: u.id, name: u.name, adminId: u.adminId,
          createdAt: new Date(u.createdAt), updatedAt: new Date(u.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((u) => e.unitIds.add(u.id));

    const updated = strategy === 'OVERWRITE' ? existingItems.length : 0;
    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Units', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importSuppliers(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((s) => !e.supplierCodes.has(s.code));
    const existingItems = items.filter((s) => e.supplierCodes.has(s.code));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.supplier.createMany({
        data: data.map((s) => ({
          id: s.id, code: s.code, name: s.name, contactPerson: s.contactPerson ?? null,
          email: s.email ?? null, phone: s.phone ?? null, address: s.address ?? null,
          city: s.city ?? null, country: s.country ?? 'Rwanda', paymentTerms: s.paymentTerms ?? null,
          rating: s.rating ?? 0, status: s.status, notes: s.notes ?? null, adminId: s.adminId ?? null,
          createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((s) => { e.supplierIds.add(s.id); e.supplierCodes.add(s.code); });

    if (strategy === 'OVERWRITE') {
      for (const s of existingItems) {
        await tx.supplier.update({
          where: { code: s.code },
          data: { name: s.name, contactPerson: s.contactPerson ?? null, email: s.email ?? null, phone: s.phone ?? null, address: s.address ?? null, status: s.status, notes: s.notes ?? null, updatedAt: new Date(s.updatedAt) },
        });
        updated++;
        e.supplierIds.add(s.id);
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Suppliers', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importSites(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((s) => !e.siteIds.has(s.id));
    const existingItems = items.filter((s) => e.siteIds.has(s.id));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.site.createMany({
        data: data.map((s) => ({
          id: s.id, name: s.name, location: s.location, managerName: s.managerName ?? null,
          status: s.status, description: s.description ?? null, budget: Number(s.budget ?? 0),
          startDate: s.startDate ? new Date(s.startDate) : null,
          endDate: s.endDate ? new Date(s.endDate) : null,
          image: s.image ?? null, adminId: s.adminId ?? null,
          createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((s) => e.siteIds.add(s.id));

    if (strategy === 'OVERWRITE') {
      for (const s of existingItems) {
        await tx.site.update({
          where: { id: s.id },
          data: { name: s.name, location: s.location, managerName: s.managerName ?? null, status: s.status, budget: Number(s.budget ?? 0), updatedAt: new Date(s.updatedAt) },
        });
        updated++;
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : existingItems.length;
    return { entity: 'Sites', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importEmployees(items: any[], e: ExistingKeys, strategy: string, tx: any): Promise<ImportResult> {
    const newItems     = items.filter((emp) => !e.employeeEmails.has(emp.email));
    const deletedItems = items.filter((emp) => e.deletedEmployeeEmails.has(emp.email));
    const activeItems  = items.filter((emp) => e.employeeEmails.has(emp.email) && !e.deletedEmployeeEmails.has(emp.email));
    let updated = 0;

    const created = await batchCreate(
      (data) => tx.employee.createMany({
        data: data.map((emp) => ({
          id: emp.id, firstName: emp.firstName, lastName: emp.lastName,
          email: emp.email, password: emp.password, phone: emp.phone,
          position: emp.position, status: emp.status, isLocked: emp.isLocked ?? false,
          profilePicture: emp.profilePicture ?? null, idCardImage: emp.idCardImage ?? null,
          cvDocument: emp.cvDocument ?? null, supportingDocument: emp.supportingDocument ?? null,
          deletedAt: emp.deletedAt ? new Date(emp.deletedAt) : null,
          createdAt: new Date(emp.createdAt), updatedAt: new Date(emp.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((emp) => { e.employeeIds.add(emp.id); e.employeeEmails.add(emp.email); });

    if (strategy === 'RESTORE_DELETED' && deletedItems.length) {
      await tx.employee.updateMany({ where: { email: { in: deletedItems.map((emp) => emp.email) } }, data: { deletedAt: null, status: 'ACTIVE' } });
      updated = deletedItems.length;
      deletedItems.forEach((emp) => e.employeeIds.add(emp.id));
    } else if (strategy === 'OVERWRITE') {
      for (const emp of [...deletedItems, ...activeItems]) {
        await tx.employee.update({
          where: { email: emp.email },
          data: { firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone, position: emp.position, status: emp.status, isLocked: emp.isLocked ?? false, updatedAt: new Date(emp.updatedAt) },
        });
        updated++;
        e.employeeIds.add(emp.id);
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : strategy === 'RESTORE_DELETED' ? activeItems.length : deletedItems.length + activeItems.length;
    return { entity: 'Employees', total: items.length, created, updated, skipped, failed: 0, warnings: ['Passwords restored as-is (already hashed)'] };
  }

  private async importEmployeePermissions(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const ep of items) {
      if (!e.employeeIds.has(ep.employeeId)) { failed++; continue; }
      if (!e.permissionIds.has(ep.permissionId)) { failed++; continue; }
      if (e.empPermPairs.has(`${ep.employeeId}:${ep.permissionId}`)) continue;
      valid.push(ep);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.employeePermission.createMany({
        data: data.map((ep) => ({ id: ep.id, employeeId: ep.employeeId, permissionId: ep.permissionId, createdAt: new Date(ep.createdAt) })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((ep) => e.empPermPairs.add(`${ep.employeeId}:${ep.permissionId}`));
    const warnings = failed ? [`${failed} records skipped — missing employee/permission`] : [];
    return { entity: 'Employee Permissions', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importSiteEmployeeAccess(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const a of items) {
      if (!e.siteIds.has(a.siteId) || !e.employeeIds.has(a.employeeId)) { failed++; continue; }
      if (e.siteAccessPairs.has(`${a.siteId}:${a.employeeId}`)) continue;
      valid.push(a);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.siteEmployeeAccess.createMany({
        data: data.map((a) => ({
          id: a.id, siteId: a.siteId, employeeId: a.employeeId,
          canManageInfo: a.canManageInfo ?? false, canManageWorkers: a.canManageWorkers ?? false,
          canManageExpenses: a.canManageExpenses ?? false, canManageStock: a.canManageStock ?? false,
          canManageStockOut: a.canManageStockOut ?? false,
          createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((a) => e.siteAccessPairs.add(`${a.siteId}:${a.employeeId}`));
    const warnings = failed ? [`${failed} site access records skipped — missing site/employee`] : [];
    return { entity: 'Site Employee Access', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importStocks(items: any[], e: ExistingKeys, strategy: string, actor: { id: string } | undefined, tx: any): Promise<ImportResult> {
    const newItems     = items.filter((s) => !e.stockSkus.has(s.sku));
    const deletedItems = items.filter((s) => e.deletedStockSkus.has(s.sku));
    const activeItems  = items.filter((s) => e.stockSkus.has(s.sku) && !e.deletedStockSkus.has(s.sku));
    let updated = 0;

    const mapCreate = (s: any) => ({
      id: s.id, sku: s.sku, itemName: s.itemName,
      categoryId: s.categoryId && e.categoryIds.has(s.categoryId) ? s.categoryId : null,
      unit: s.unit ?? 'pcs',
      quantity: Math.round(Number(s.quantity) || 0),
      unitCost: parseFloat(s.unitCost) || 0,
      totalValue: Math.round(Number(s.quantity) || 0) * (parseFloat(s.unitCost) || 0),
      warehouseLocation: s.warehouseLocation ?? null,
      receivedDate: s.receivedDate ? new Date(s.receivedDate) : new Date(),
      reorderLevel: Math.round(Number(s.reorderLevel) || 5),
      expiryDate: s.expiryDate ? new Date(s.expiryDate) : null,
      description: s.description ?? null, stockImg: s.stockImg ?? null,
      adminId: s.adminId || actor?.id || 'system',
      siteId: s.siteId && e.siteIds.has(s.siteId) ? s.siteId : null,
      stockType: (['MATERIAL', 'EQUIPMENT'].includes(s.stockType)) ? s.stockType : 'MATERIAL',
      quantityOut: s.quantityOut ?? 0,
      deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
      createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt),
    });

    const created = await batchCreate(
      (data) => tx.stock.createMany({ data: data.map(mapCreate), skipDuplicates: true }),
      newItems,
    );
    newItems.forEach((s) => { e.stockIds.add(s.id); e.stockSkus.add(s.sku); });

    if (strategy === 'RESTORE_DELETED' && deletedItems.length) {
      await tx.stock.updateMany({ where: { sku: { in: deletedItems.map((s) => s.sku) } }, data: { deletedAt: null } });
      updated = deletedItems.length;
      deletedItems.forEach((s) => { e.stockIds.add(s.id); e.stockSkus.add(s.sku); });
    } else if (strategy === 'OVERWRITE') {
      for (const s of [...deletedItems, ...activeItems]) {
        await tx.stock.update({
          where: { sku: s.sku },
          data: {
            itemName: s.itemName, unit: s.unit ?? 'pcs',
            categoryId: s.categoryId && e.categoryIds.has(s.categoryId) ? s.categoryId : null,
            quantity: Math.round(Number(s.quantity) || 0),
            unitCost: parseFloat(s.unitCost) || 0,
            totalValue: Math.round(Number(s.quantity) || 0) * (parseFloat(s.unitCost) || 0),
            reorderLevel: Math.round(Number(s.reorderLevel) || 5),
            deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
            updatedAt: new Date(s.updatedAt),
          },
        });
        updated++;
        e.stockIds.add(s.id);
      }
    }

    const skipped = strategy === 'OVERWRITE' ? 0 : strategy === 'RESTORE_DELETED' ? activeItems.length : deletedItems.length + activeItems.length;
    return { entity: 'Stock', total: items.length, created, updated, skipped, failed: 0, warnings: [] };
  }

  private async importStockSuppliers(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const ss of items) {
      if (!e.stockIds.has(ss.stockId) || !e.supplierIds.has(ss.supplierId)) { failed++; continue; }
      if (e.stockSupplierPairs.has(`${ss.stockId}:${ss.supplierId}`)) continue;
      valid.push(ss);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.stockSupplier.createMany({
        data: data.map((ss) => ({ id: ss.id, stockId: ss.stockId, supplierId: ss.supplierId })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((ss) => e.stockSupplierPairs.add(`${ss.stockId}:${ss.supplierId}`));
    const warnings = failed ? [`${failed} stock-supplier links skipped — missing stock or supplier`] : [];
    return { entity: 'Stock Suppliers', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importStockMigrations(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const m of items) {
      if (e.stockMigrationIds.has(m.id)) continue;
      if (!e.stockIds.has(m.stockId) || !e.siteIds.has(m.sourceSiteId) || !e.siteIds.has(m.destinationSiteId)) { failed++; continue; }
      valid.push(m);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.stockMigration.createMany({
        data: data.map((m) => ({
          id: m.id, stockId: m.stockId, sourceSiteId: m.sourceSiteId,
          destinationSiteId: m.destinationSiteId,
          destinationStockId: m.destinationStockId && e.stockIds.has(m.destinationStockId) ? m.destinationStockId : null,
          quantity: m.quantity, unit: m.unit, unitCostAtMigration: parseFloat(m.unitCostAtMigration) || 0,
          status: m.status, instant: m.instant ?? false,
          notes: m.notes ?? null, cancelReason: m.cancelReason ?? null,
          initiatedById: m.initiatedById, initiatedByType: m.initiatedByType, initiatedByName: m.initiatedByName ?? null,
          receivedById: m.receivedById ?? null, receivedByType: m.receivedByType ?? null, receivedByName: m.receivedByName ?? null,
          dispatchedAt: new Date(m.dispatchedAt), receivedAt: m.receivedAt ? new Date(m.receivedAt) : null,
          cancelledAt: m.cancelledAt ? new Date(m.cancelledAt) : null,
          createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((m) => e.stockMigrationIds.add(m.id));
    const warnings = failed ? [`${failed} migrations skipped — missing stock or sites`] : [];
    return { entity: 'Stock Migrations', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importStockHistory(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid  = items.filter((h) => e.stockIds.has(h.stockId) && !e.stockHistoryIds.has(h.id));
    const failed = items.filter((h) => !e.stockIds.has(h.stockId)).length;
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.stockHistory.createMany({
        data: data.map((h) => ({
          id: h.id, stockId: h.stockId, movementType: h.movementType,
          qtyBefore: Math.round(Number(h.qtyBefore)), qtyChange: Math.round(Number(h.qtyChange)), qtyAfter: Math.round(Number(h.qtyAfter)),
          unitPrice: h.unitPrice != null ? parseFloat(h.unitPrice) : null,
          notes: h.notes ?? null,
          createdByAdminId: h.createdByAdminId ?? null, createdByEmployeeId: h.createdByEmployeeId ?? null,
          siteId: h.siteId && e.siteIds.has(h.siteId) ? h.siteId : null,
          migrationId: h.migrationId && e.stockMigrationIds.has(h.migrationId) ? h.migrationId : null,
          createdAt: new Date(h.createdAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((h) => e.stockHistoryIds.add(h.id));
    const warnings = failed ? [`${failed} stock history records skipped — referenced stock not found`] : [];
    return { entity: 'Stock History', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importStockOuts(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const o of items) {
      if (e.stockOutIds.has(o.id)) continue;
      if (!e.siteIds.has(o.siteId) || !e.stockIds.has(o.stockId)) { failed++; continue; }
      valid.push(o);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.stockOut.createMany({
        data: data.map((o) => ({
          id: o.id, siteId: o.siteId, stockId: o.stockId,
          quantity: o.quantity, unit: o.unit, notes: o.notes ?? null,
          date: new Date(o.date), recordedById: o.recordedById, recordedByType: o.recordedByType ?? 'ADMIN',
          recordedByName: o.recordedByName ?? null, status: o.status,
          returnedAt: o.returnedAt ? new Date(o.returnedAt) : null, returnNotes: o.returnNotes ?? null,
          createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((o) => e.stockOutIds.add(o.id));
    const warnings = failed ? [`${failed} stock-outs skipped — missing site or stock`] : [];
    return { entity: 'Stock Outs', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importRequisitions(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const newItems = items.filter((r) => !e.requisitionIds.has(r.id));
    const skipped  = items.length - newItems.length;
    const created = await batchCreate(
      (data) => tx.requisition.createMany({
        data: data.map((r) => ({
          id: r.id, status: r.status, description: r.description ?? null, rejectReason: r.rejectReason ?? null,
          employeeId: r.employeeId && e.employeeIds.has(r.employeeId) ? r.employeeId : null,
          createdByAdminId: r.createdByAdminId ?? null,
          supplierId: r.supplierId && e.supplierIds.has(r.supplierId) ? r.supplierId : null,
          siteId: r.siteId && e.siteIds.has(r.siteId) ? r.siteId : null,
          approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
          completedAt: r.completedAt ? new Date(r.completedAt) : null,
          createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((r) => e.requisitionIds.add(r.id));
    return { entity: 'Requisitions', total: items.length, created, updated: 0, skipped, failed: 0, warnings: [] };
  }

  private async importRequisitionItems(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const i of items) {
      if (e.requisitionItemIds.has(i.id)) continue;
      if (!e.requisitionIds.has(i.requisitionId)) { failed++; continue; }
      valid.push(i);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.requisitionItem.createMany({
        data: data.map((i) => ({
          id: i.id, requisitionId: i.requisitionId,
          stockId: i.stockId && e.stockIds.has(i.stockId) ? i.stockId : null,
          itemName: i.itemName, quantity: i.quantity, unit: i.unit,
          note: i.note ?? null, costPrice: i.costPrice ?? null, receivedQty: i.receivedQty ?? 0,
          receivingStatus: i.receivingStatus, paymentType: i.paymentType ?? 'NONE',
          createdAt: new Date(i.createdAt), updatedAt: new Date(i.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((i) => e.requisitionItemIds.add(i.id));
    const warnings = failed ? [`${failed} requisition items skipped — referenced requisition not found`] : [];
    return { entity: 'Requisition Items', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importReceivingLogs(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid  = items.filter((l) => e.requisitionItemIds.has(l.requisitionItemId) && !e.receivingLogIds.has(l.id));
    const failed = items.filter((l) => !e.requisitionItemIds.has(l.requisitionItemId)).length;
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.receivingLog.createMany({
        data: data.map((l) => ({
          id: l.id, requisitionItemId: l.requisitionItemId, receivedQty: l.receivedQty,
          receivedById: l.receivedById, receivedByType: l.receivedByType ?? 'ADMIN',
          receivedByName: l.receivedByName ?? null, note: l.note ?? null,
          receivedAt: new Date(l.receivedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((l) => e.receivingLogIds.add(l.id));
    const warnings = failed ? [`${failed} receiving logs skipped — referenced requisition item not found`] : [];
    return { entity: 'Receiving Logs', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importSupplierPayments(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const p of items) {
      if (e.supplierPaymentIds.has(p.id)) continue;
      if (!e.supplierIds.has(p.supplierId)) { failed++; continue; }
      valid.push(p);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.supplierPayment.createMany({
        data: data.map((p) => ({
          id: p.id, supplierId: p.supplierId,
          stockId: p.stockId && e.stockIds.has(p.stockId) ? p.stockId : null,
          requisitionItemId: p.requisitionItemId && e.requisitionItemIds.has(p.requisitionItemId) ? p.requisitionItemId : null,
          type: p.type, amount: parseFloat(p.amount), quantity: p.quantity ? parseFloat(p.quantity) : null,
          reference: p.reference ?? null, notes: p.notes ?? null, date: new Date(p.date),
          adminId: p.adminId, status: p.status ?? 'UNPAID', paidAmount: parseFloat(p.paidAmount ?? 0),
          createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((p) => e.supplierPaymentIds.add(p.id));
    const warnings = failed ? [`${failed} supplier payments skipped — referenced supplier not found`] : [];
    return { entity: 'Supplier Payments', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importSiteWorkerRecords(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const w of items) {
      if (e.siteWorkerRecordIds.has(w.id)) continue;
      if (!e.siteIds.has(w.siteId)) { failed++; continue; }
      valid.push(w);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.siteWorkerRecord.createMany({
        data: data.map((w) => ({
          id: w.id, siteId: w.siteId, date: new Date(w.date), workerCount: w.workerCount,
          notes: w.notes ?? null, recordedBy: w.recordedBy,
          adminId: w.adminId ?? null,
          categoryId: w.categoryId && e.workerCategoryIds.has(w.categoryId) ? w.categoryId : null,
          createdAt: new Date(w.createdAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((w) => e.siteWorkerRecordIds.add(w.id));
    const warnings = failed ? [`${failed} worker records skipped — referenced site not found`] : [];
    return { entity: 'Site Worker Records', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importSiteExpenses(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const valid: any[] = [];
    let failed = 0;
    for (const ex of items) {
      if (e.siteExpenseIds.has(ex.id)) continue;
      if (!e.siteIds.has(ex.siteId)) { failed++; continue; }
      valid.push(ex);
    }
    const skipped = items.length - valid.length - failed;
    const created = await batchCreate(
      (data) => tx.siteExpense.createMany({
        data: data.map((ex) => ({
          id: ex.id, siteId: ex.siteId, description: ex.description, amount: parseFloat(ex.amount),
          category: ex.category ?? null, date: new Date(ex.date), reference: ex.reference ?? null,
          notes: ex.notes ?? null, adminId: ex.adminId ?? null,
          createdAt: new Date(ex.createdAt), updatedAt: new Date(ex.updatedAt),
        })),
        skipDuplicates: true,
      }),
      valid,
    );
    valid.forEach((ex) => e.siteExpenseIds.add(ex.id));
    const warnings = failed ? [`${failed} site expenses skipped — referenced site not found`] : [];
    return { entity: 'Site Expenses', total: items.length, created, updated: 0, skipped, failed, warnings };
  }

  private async importSiteSettings(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const newItems      = items.filter((s) => !e.siteSettingKeys.has(s.key));
    const existingItems = items.filter((s) => e.siteSettingKeys.has(s.key));
    const created = await batchCreate(
      (data) => tx.siteSetting.createMany({
        data: data.map((s) => ({ id: s.id, key: s.key, value: s.value ?? null, updatedAt: new Date(s.updatedAt) })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((s) => e.siteSettingKeys.add(s.key));
    const skipped = existingItems.length;
    return { entity: 'Site Settings', total: items.length, created, updated: 0, skipped, failed: 0, warnings: [] };
  }

  private async importActivityLogs(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const newItems = items.filter((l) => !e.activityLogIds.has(l.id));
    const skipped  = items.length - newItems.length;
    const created = await batchCreate(
      (data) => tx.activityLog.createMany({
        data: data.map((l) => ({
          id: l.id, action: l.action, entityType: l.entityType,
          entityId: l.entityId ?? null, entityLabel: l.entityLabel ?? null,
          performedById: l.performedById, performedByType: l.performedByType,
          performedByName: l.performedByName ?? null,
          ...(l.metadata != null ? { metadata: l.metadata } : {}),
          ipAddress: l.ipAddress ?? null, createdAt: new Date(l.createdAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((l) => e.activityLogIds.add(l.id));
    return { entity: 'Activity Logs', total: items.length, created, updated: 0, skipped, failed: 0, warnings: [] };
  }

  private async importNotifications(items: any[], e: ExistingKeys, tx: any): Promise<ImportResult> {
    const newItems = items.filter((n) => !e.notificationIds.has(n.id));
    const skipped  = items.length - newItems.length;
    const created = await batchCreate(
      (data) => tx.notification.createMany({
        data: data.map((n) => ({
          id: n.id, recipients: n.recipients, senderId: n.senderId ?? null,
          senderType: n.senderType ?? null, title: n.title, message: n.message,
          link: n.link ?? null, createdAt: new Date(n.createdAt),
        })),
        skipDuplicates: true,
      }),
      newItems,
    );
    newItems.forEach((n) => e.notificationIds.add(n.id));
    return { entity: 'Notifications', total: items.length, created, updated: 0, skipped, failed: 0, warnings: [] };
  }

  // ─── Helpers ─────────────────────────────────────────

  private validate(payload: any) {
    if (!payload || !payload.exportVersion || !payload.data) {
      throw new BadRequestException('Invalid backup file. Expected an amza_project JSON export.');
    }
  }

  private buildWarnings(payload: any, strategy?: string): string[] {
    const d = payload.data;
    const warnings: string[] = [];
    if (d.admins?.length)     warnings.push(`Admin accounts included (${d.admins.length}) — passwords restored as-is`);
    if (d.employees?.length)  warnings.push(`Employee data included (${d.employees.length}) — passwords restored as-is (already hashed)`);
    if ((d.activityLogs?.length ?? 0) > 10000) warnings.push(`Large activity log (${d.activityLogs.length.toLocaleString()} records) — import may take several minutes`);
    if ((d.stockHistory?.length ?? 0) > 10000) warnings.push(`Large stock history (${d.stockHistory.length.toLocaleString()} records) — import may take a while`);
    if (strategy === 'OVERWRITE')       warnings.push('OVERWRITE mode: existing master data will be replaced with backup values. Audit records are never overwritten.');
    if (strategy === 'RESTORE_DELETED') warnings.push('RESTORE_DELETED mode: only soft-deleted stocks and employees will be restored. Active records are not affected.');
    return warnings;
  }

  private detectConflicts(d: any, e: ExistingKeys): string[] {
    const conflicts: string[] = [];
    if (d.admins?.some((a: any) => e.adminEmails.has(a.email)))            conflicts.push('Admins');
    if (d.employees?.some((emp: any) => e.employeeEmails.has(emp.email)))  conflicts.push('Employees');
    if (d.permissions?.some((p: any) => e.permissionNames.has(p.name)))   conflicts.push('Permissions');
    if (d.categories?.some((c: any) => e.categoryIds.has(c.id)))           conflicts.push('Categories');
    if (d.units?.some((u: any) => e.unitIds.has(u.id)))                    conflicts.push('Units');
    if (d.suppliers?.some((s: any) => e.supplierCodes.has(s.code)))        conflicts.push('Suppliers');
    if (d.stocks?.some((s: any) => e.stockSkus.has(s.sku)))                conflicts.push('Stock');
    return conflicts;
  }

  private async loadExisting(): Promise<ExistingKeys> {
    const [
      admins, employees, deletedEmployees, permissions, empPerms,
      workerCategories, categories, units, suppliers, sites, siteAccess,
      stocks, deletedStocks, stockSuppliers,
      stockMigrations, stockHistory, stockOuts,
      requisitions, requisitionItems, receivingLogs, supplierPayments,
      siteWorkerRecords, siteExpenses, siteSettings,
      activityLogs, notifications,
    ] = await Promise.all([
      this.prisma.admin.findMany({ select: { id: true, email: true } }),
      this.prisma.employee.findMany({ select: { id: true, email: true } }),
      this.prisma.employee.findMany({ where: { deletedAt: { not: null } }, select: { email: true } }),
      this.prisma.permission.findMany({ select: { id: true, name: true } }),
      this.prisma.employeePermission.findMany({ select: { employeeId: true, permissionId: true } }),
      this.prisma.workerCategory.findMany({ select: { id: true, name: true } }),
      this.prisma.category.findMany({ select: { id: true } }),
      this.prisma.unit.findMany({ select: { id: true } }),
      this.prisma.supplier.findMany({ select: { id: true, code: true } }),
      this.prisma.site.findMany({ select: { id: true } }),
      this.prisma.siteEmployeeAccess.findMany({ select: { siteId: true, employeeId: true } }),
      this.prisma.stock.findMany({ select: { id: true, sku: true } }),
      this.prisma.stock.findMany({ where: { deletedAt: { not: null } }, select: { sku: true } }),
      this.prisma.stockSupplier.findMany({ select: { stockId: true, supplierId: true } }),
      this.prisma.stockMigration.findMany({ select: { id: true } }),
      this.prisma.stockHistory.findMany({ select: { id: true } }),
      this.prisma.stockOut.findMany({ select: { id: true } }),
      this.prisma.requisition.findMany({ select: { id: true } }),
      this.prisma.requisitionItem.findMany({ select: { id: true } }),
      this.prisma.receivingLog.findMany({ select: { id: true } }),
      this.prisma.supplierPayment.findMany({ select: { id: true } }),
      this.prisma.siteWorkerRecord.findMany({ select: { id: true } }),
      this.prisma.siteExpense.findMany({ select: { id: true } }),
      this.prisma.siteSetting.findMany({ select: { key: true } }),
      this.prisma.activityLog.findMany({ select: { id: true } }),
      this.prisma.notification.findMany({ select: { id: true } }),
    ]);

    return {
      adminEmails:           new Set(admins.map((a) => a.email)),
      adminIds:              new Set(admins.map((a) => a.id)),
      employeeEmails:        new Set(employees.map((e) => e.email)),
      employeeIds:           new Set(employees.map((e) => e.id)),
      deletedEmployeeEmails: new Set(deletedEmployees.map((e) => e.email)),
      permissionNames:       new Set(permissions.map((p) => p.name)),
      permissionIds:         new Set(permissions.map((p) => p.id)),
      empPermPairs:          new Set(empPerms.map((ep) => `${ep.employeeId}:${ep.permissionId}`)),
      workerCategoryIds:     new Set(workerCategories.map((w) => w.id)),
      workerCategoryNames:   new Set(workerCategories.map((w) => w.name)),
      categoryIds:           new Set(categories.map((c) => c.id)),
      unitIds:               new Set(units.map((u) => u.id)),
      supplierCodes:         new Set(suppliers.map((s) => s.code)),
      supplierIds:           new Set(suppliers.map((s) => s.id)),
      siteIds:               new Set(sites.map((s) => s.id)),
      siteAccessPairs:       new Set(siteAccess.map((a) => `${a.siteId}:${a.employeeId}`)),
      stockSkus:             new Set(stocks.map((s) => s.sku)),
      stockIds:              new Set(stocks.map((s) => s.id)),
      deletedStockSkus:      new Set(deletedStocks.map((s) => s.sku)),
      stockSupplierPairs:    new Set(stockSuppliers.map((ss) => `${ss.stockId}:${ss.supplierId}`)),
      stockMigrationIds:     new Set(stockMigrations.map((m) => m.id)),
      stockHistoryIds:       new Set(stockHistory.map((h) => h.id)),
      stockOutIds:           new Set(stockOuts.map((o) => o.id)),
      requisitionIds:        new Set(requisitions.map((r) => r.id)),
      requisitionItemIds:    new Set(requisitionItems.map((i) => i.id)),
      receivingLogIds:       new Set(receivingLogs.map((l) => l.id)),
      supplierPaymentIds:    new Set(supplierPayments.map((p) => p.id)),
      siteWorkerRecordIds:   new Set(siteWorkerRecords.map((w) => w.id)),
      siteExpenseIds:        new Set(siteExpenses.map((e) => e.id)),
      siteSettingKeys:       new Set(siteSettings.map((s) => s.key)),
      activityLogIds:        new Set(activityLogs.map((l) => l.id)),
      notificationIds:       new Set(notifications.map((n) => n.id)),
    };
  }
}
