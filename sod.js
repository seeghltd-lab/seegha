const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, WidthType, ShadingType, BorderStyle, HeadingLevel, 
        PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { 
      document: { 
        run: { font: "Arial", size: 24 } 
      } 
    },
    paragraphStyles: [
      { 
        id: "Heading1", 
        name: "Heading 1", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 }
      },
      { 
        id: "Heading2", 
        name: "Heading 2", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 }
      },
      { 
        id: "Heading3", 
        name: "Heading 3", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      { 
        reference: "bullets",
        levels: [
          { 
            level: 0, 
            format: LevelFormat.BULLET, 
            text: "•", 
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: {
          width: 12240,
          height: 15840
        },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "WEB DEVELOPMENT FUNDAMENTALS",
            bold: true,
            size: 36,
            font: "Arial",
            color: "2E75B6"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "Level 4 Software Development",
            size: 28,
            font: "Arial"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [
          new TextRun({
            text: "4-Week Curriculum Guide",
            size: 26,
            font: "Arial",
            italics: true
          })
        ]
      }),

      // Course Overview
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Course Overview")]
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "This Level 4 Software Development curriculum provides comprehensive training in web development fundamentals. The course emphasizes HTML and CSS as core technologies, with supporting coverage of JavaScript for interactivity, and introductory exposure to PHP and databases for backend development. Students will build real-world web projects throughout the four-week period, Monday through Friday."
          })
        ]
      }),

      // Course Focus
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Course Focus Distribution")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [
          new TextRun({
            text: "Primary Focus (60%): HTML & CSS - Structure, styling, layouts, responsive design",
            bold: true
          })
        ]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [
          new TextRun({
            text: "Secondary Focus (25%): JavaScript - DOM manipulation, events, basic interactivity"
          })
        ]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [
          new TextRun({
            text: "Introduction (10%): PHP - Basic syntax, forms processing, sessions"
          })
        ]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "Introduction (5%): Database Basics - MySQL fundamentals, basic queries"
          })
        ]
      }),

      // Learning Outcomes
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Learning Outcomes")]
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun("By the end of this course, students will be able to:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create well-structured, semantic HTML documents")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Style web pages using CSS including layouts, responsive design, and modern techniques")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build responsive websites that work across different devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Add interactivity to web pages using JavaScript")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Process form data using PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Perform basic database operations with MySQL")]
      }),

      new Paragraph({
        children: [new PageBreak()]
      }),

      // WEEK 1
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Week 1: HTML Foundations & Basic CSS")]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: "Focus: HTML structure, semantic elements, text formatting, and introduction to CSS styling",
            italics: true
          })
        ]
      }),

      // Monday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Monday - Introduction to HTML")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Introduction to web development and the web")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("HTML document structure (<!DOCTYPE>, <html>, <head>, <body>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Basic HTML tags: headings (h1-h6), paragraphs (p)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Setting up development environment (text editor, browser)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("HTML comments")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create first HTML page with proper structure")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build a simple personal introduction page")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice using different heading levels")]
      }),

      // Tuesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Tuesday - HTML Text Formatting & Lists")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Text formatting tags: <strong>, <em>, <b>, <i>, <u>, <mark>")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Line breaks (<br>) and horizontal rules (<hr>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Unordered lists (<ul>, <li>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Ordered lists (<ol>, <li>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Nested lists")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create formatted content pages with various text styles")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build shopping list and recipe pages using lists")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Create nested navigation menu structure")]
      }),

      // Wednesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Wednesday - HTML Links, Images & Multimedia")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Hyperlinks (<a>) - internal and external links")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Link targets (_blank, _self)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Images (<img>) - src, alt attributes")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Image sizing and optimization")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("File paths (relative vs absolute)")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create multi-page website with navigation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build image gallery page")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice proper file organization and linking")]
      }),

      // Thursday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Thursday - HTML Tables & Semantic Elements")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Table structure (<table>, <tr>, <td>, <th>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Table sections (<thead>, <tbody>, <tfoot>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Table attributes (colspan, rowspan)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Semantic HTML5 elements (<header>, <nav>, <main>, <section>, <article>, <footer>)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Semantic markup importance")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create data table (timetable, price list)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build semantically structured web page")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice proper HTML5 document structure")]
      }),

      // Friday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Friday - Introduction to CSS")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("What is CSS and why we need it")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("CSS syntax (selectors, properties, values)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Three ways to add CSS (inline, internal, external)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Basic selectors (element, class, id)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Color properties (color, background-color)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("CSS comments")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Add basic styling to previous HTML pages")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Practice different CSS implementation methods")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Week 1 Project: Build a simple multi-page website with basic styling")]
      }),

      new Paragraph({
        children: [new PageBreak()]
      }),

      // WEEK 2
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Week 2: Advanced CSS & Layout Techniques")]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: "Focus: CSS styling mastery, box model, positioning, flexbox, and responsive design",
            italics: true
          })
        ]
      }),

      // Monday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Monday - CSS Typography & Text Styling")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Font properties (font-family, font-size, font-weight, font-style)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Text properties (text-align, text-decoration, text-transform, line-height)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Web fonts (Google Fonts)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Color values (hex, rgb, rgba)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Letter and word spacing")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Style typography-heavy content pages")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Integrate Google Fonts into projects")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Create visually appealing text layouts")]
      }),

      // Tuesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Tuesday - CSS Box Model & Spacing")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Understanding the box model (content, padding, border, margin)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Margin properties (margin-top, margin-right, etc.)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Padding properties")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Border properties (border-width, border-style, border-color, border-radius)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Width and height properties")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Box-sizing property")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create card layouts with proper spacing")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build button components with hover effects")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice box model calculations")]
      }),

      // Wednesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Wednesday - CSS Display & Positioning")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Display property (block, inline, inline-block, none)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Position property (static, relative, absolute, fixed, sticky)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Z-index and stacking context")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Float and clear properties")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Overflow property")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create fixed navigation header")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build image overlay effects")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice different positioning techniques")]
      }),

      // Thursday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Thursday - CSS Flexbox")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Introduction to Flexbox")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Flex container properties (display: flex, flex-direction, justify-content, align-items)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Flex item properties (flex-grow, flex-shrink, flex-basis)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Flex wrap and alignment")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Building responsive layouts with Flexbox")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create flexible navigation menus")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build card grid layouts")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Design centered content layouts")]
      }),

      // Friday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Friday - Responsive Design & Media Queries")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Responsive web design principles")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Viewport meta tag")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Media queries syntax and breakpoints")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Mobile-first approach")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Responsive images and units (%, vw, vh, em, rem)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Testing responsive designs")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Convert existing layouts to responsive")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create mobile navigation menu")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Week 2 Project: Build a fully responsive business website landing page")]
      }),

      new Paragraph({
        children: [new PageBreak()]
      }),

      // WEEK 3
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Week 3: JavaScript Fundamentals & Interactivity")]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: "Focus: JavaScript basics, DOM manipulation, events, and adding interactivity to web pages",
            italics: true
          })
        ]
      }),

      // Monday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Monday - JavaScript Basics")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Introduction to JavaScript")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Adding JavaScript to HTML (internal and external)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Variables (var, let, const)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Data types (string, number, boolean)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Basic operators and console.log()")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Comments in JavaScript")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Write first JavaScript programs")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Practice variable declarations and assignments")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Simple calculations and string operations")]
      }),

      // Tuesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Tuesday - JavaScript Control Structures")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Conditional statements (if, else if, else)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Comparison and logical operators")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Switch statements")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Loops (for, while)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Functions basics")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build simple decision-making programs")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create loops to iterate through data")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Write reusable functions")]
      }),

      // Wednesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Wednesday - DOM Manipulation")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("What is the DOM (Document Object Model)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Selecting elements (getElementById, querySelector, querySelectorAll)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Changing content (innerHTML, textContent)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Modifying styles and classes")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Creating and removing elements")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Dynamically change page content")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Toggle CSS classes on elements")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Build interactive content displays")]
      }),

      // Thursday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Thursday - JavaScript Events")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Event handling basics")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Click events")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Mouse events (mouseover, mouseout)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Keyboard events")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Form events (submit, change, input)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Event listeners (addEventListener)")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create interactive buttons and menus")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build image slider/gallery with navigation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Add form validation")]
      }),

      // Friday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Friday - HTML Forms & JavaScript Validation")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("HTML form elements (input, textarea, select, button)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Input types (text, email, password, number, date, etc.)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Form attributes (required, placeholder, pattern)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("JavaScript form validation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Displaying error messages")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create contact form with validation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build registration form")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Week 3 Project: Interactive portfolio website with form and dynamic content")]
      }),

      new Paragraph({
        children: [new PageBreak()]
      }),

      // WEEK 4
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Week 4: Introduction to PHP & Databases")]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: "Focus: PHP basics, form processing, sessions, and introduction to MySQL databases",
            italics: true
          })
        ]
      }),

      // Monday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Monday - Introduction to PHP")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("What is PHP and server-side programming")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Setting up PHP environment (XAMPP/WAMP)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("PHP syntax and basic structure")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Variables and data types in PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Echo and print statements")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("PHP comments")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Write first PHP script")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create dynamic HTML with PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice PHP variables and output")]
      }),

      // Tuesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Tuesday - PHP Forms & Data Processing")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("PHP superglobals ($_GET, $_POST, $_REQUEST)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Processing form data with PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("GET vs POST methods")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Form validation in PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Sanitizing and validating user input")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build form that processes data with PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create login form")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Implement server-side validation")]
      }),

      // Wednesday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Wednesday - PHP Sessions & Cookies")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Understanding sessions and cookies")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Starting sessions (session_start())")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Session variables ($_SESSION)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Creating and reading cookies")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Simple authentication system")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build login/logout system with sessions")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create shopping cart functionality")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Remember user preferences with cookies")]
      }),

      // Thursday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Thursday - Introduction to Databases (MySQL)")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Database concepts and terminology")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Introduction to MySQL and phpMyAdmin")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Creating databases and tables")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Basic SQL queries (SELECT, INSERT, UPDATE, DELETE)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Data types in MySQL")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Primary keys and basic table structure")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create database using phpMyAdmin")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Design simple table structures")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Practice basic SQL queries")]
      }),

      // Friday
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Friday - PHP & MySQL Integration")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Topics Covered:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Connecting PHP to MySQL (mysqli)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Executing queries from PHP")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Fetching and displaying database data")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Inserting form data into database")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 120 },
        children: [new TextRun("Course review and integration")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Practical Exercises:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Build user registration system with database storage")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create data display page from database")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Final Project: Complete web application with HTML/CSS frontend, JavaScript interactivity, PHP backend, and MySQL database")]
      }),

      new Paragraph({
        children: [new PageBreak()]
      }),

      // Assessment & Evaluation
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Assessment & Evaluation")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Weekly Projects (50%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Week 1: Multi-page website with semantic HTML and basic CSS (10%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Week 2: Fully responsive business landing page (15%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Week 3: Interactive portfolio website with JavaScript (15%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Week 4: Full-stack web application with PHP and database (10%)")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Daily Practice Exercises (20%)")]
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "Completion of in-class coding exercises and assignments (Monday-Friday each week)"
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Final Comprehensive Project (30%)")]
      }),
      new Paragraph({
        spacing: { after: 360 },
        children: [
          new TextRun({
            text: "Complete website project demonstrating proficiency in HTML, CSS, JavaScript, PHP, and database integration"
          })
        ]
      }),

      // Required Skills Breakdown
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Required Skills by Priority")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Core Skills (Must Master - 60%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("HTML5 semantic markup and structure")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("CSS styling, layout techniques, and Flexbox")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Responsive design with media queries")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("CSS box model, positioning, and display properties")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Supporting Skills (Should Know - 25%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("JavaScript fundamentals and DOM manipulation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Event handling and basic interactivity")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Form validation with JavaScript")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Introductory Skills (Basic Understanding - 15%)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("PHP syntax and form processing")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Session management")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Basic MySQL database operations")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("PHP-MySQL integration")]
      }),

      // Resources
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Required Resources")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Text editor (VS Code, Sublime Text, or Notepad++)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Modern web browser (Chrome, Firefox, or Edge)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("XAMPP or WAMP server (for PHP and MySQL)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Internet connection for resources and documentation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Course study materials and code examples")]
      }),

      // Study Tips
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Study Tips for Success")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Practice coding daily - build small projects outside class")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Use browser developer tools to inspect and debug")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Study existing websites to understand structure and design")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Type all code yourself rather than copying")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Test your websites on different browsers and devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Keep organized folder structures for your projects")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Use online resources (MDN, W3Schools) for reference")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Collaborate with classmates and share knowledge")]
      }),

      // Conclusion
      new Paragraph({
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: "This Level 4 Software Development curriculum provides a solid foundation in web development, with strong emphasis on HTML and CSS mastery. Students will gain practical experience in building modern, responsive websites while being introduced to backend technologies. By the end of four weeks, students will have the skills to create complete, functional web applications.",
            italics: true
          })
        ]
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("./L4_Software_Development_WebDev_Curriculum.docx", buffer);
  console.log("Document created successfully!");
});