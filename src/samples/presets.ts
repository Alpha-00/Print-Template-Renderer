import { RequestParams } from '../types';

export const SAMPLE_PRESETS: { id: string; name: string; description: string; params: RequestParams }[] = [
  {
    id: 'typst-invoice',
    name: 'Typst - Business Invoice & Table',
    description: 'Typst document with metadata, client details, and a dynamic table generated from a JSON list.',
    params: {
      type: 'typst',
      url: '',
      data: [
        { id: 1, description: 'Cloud Infrastructure Architecture', hours: 32, rate: '$120.00', amount: '$3,840.00' },
        { id: 2, description: 'Frontend React & Typst Integration', hours: 45, rate: '$95.00', amount: '$4,275.00' },
        { id: 3, description: 'Automated CI/CD Pipeline Setup', hours: 16, rate: '$110.00', amount: '$1,760.00' },
        { id: 4, description: 'Performance & Accessibility Audit', hours: 10, rate: '$100.00', amount: '$1,000.00' },
        { id: 5, description: 'Production Deployment & Handoff', hours: 8, rate: '$125.00', amount: '$1,000.00' }
      ],
      config: {
        title: "INVOICE #INV-2026-884",
        pageSize: "A4",
        orientation: "portrait",
        primaryColor: "#0284c7",
        clientName: "Acme Corporation",
        dueDate: "2026-12-01",
        currency: "USD"
      },
      inlineSource: `#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: "Liberation Sans", size: 10pt)

#grid(
  columns: (1fr, 1fr),
  [
    #text(size: 20pt, weight: "bold", fill: rgb("#0284c7"))[#config.at("title", default: "INVOICE")]
    
    #v(4pt)
    *Invoice To:* #config.at("clientName", default: "Acme Global") \\
    *Due Date:* #config.at("dueDate", default: "Net 30") \\
    *Status:* Pending Payment
  ],
  align(right)[
    #text(size: 14pt, weight: "bold")[Honmyou Studios] \\
    100 Innovation Way \\
    contact@honmyou.dev \\
    honmyou.dev
  ]
)

#v(20pt)
#line(length: 100%, stroke: 1.5pt + rgb("#0284c7"))
#v(10pt)

#text(size: 12pt, weight: "bold")[Service Breakdown]
#v(6pt)

#auto_table(data)

#v(20pt)
#align(right)[
  #block(width: 45%, [
    #grid(
      columns: (1fr, 1fr),
      row-gutter: 8pt,
      [Subtotal:], align(right)[$11,875.00],
      [Tax (8.5%):], align(right)[$1,009.38],
      line(length: 100%), line(length: 100%),
      [*Total Due:*], align(right)[*#text(fill: rgb("#0284c7"), size: 13pt)[$12,884.38]*]
    )
  ])
]

#v(35pt)
#align(center)[
  #text(fill: luma(120), size: 9pt)[Thank you for your business! Please remit payment within 30 days.]
]
`
    }
  },
  {
    id: 'svg-badge',
    name: 'SVG - Certificate of Achievement',
    description: 'Scalable vector graphics template with dynamic data interpolation and custom vector styling.',
    params: {
      type: 'svg',
      url: '',
      data: [
        { code: "MOD-101", module: "Distributed Computing", grade: "A+", credits: 4 },
        { code: "MOD-204", module: "Advanced Typographic Systems", grade: "A", credits: 3 },
        { code: "MOD-305", module: "WebAssembly Runtimes", grade: "A+", credits: 4 },
        { code: "MOD-401", module: "Client-Side PDF Engines", grade: "A+", credits: 4 }
      ],
      config: {
        title: "CERTIFICATE OF EXCELLENCE",
        recipientName: "Alex Mercer",
        awardDescription: "For outstanding engineering in Print Template & Document Generation Systems",
        date: "November 2026",
        primaryColor: "#0284c7",
        orientation: "landscape"
      },
      inlineSource: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842 595" width="842" height="595">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="842" height="595" fill="url(#bgGrad)" />

  <!-- Outer Decorative Border -->
  <rect x="25" y="25" width="792" height="545" fill="none" stroke="url(#goldGrad)" stroke-width="3" rx="12" />
  <rect x="35" y="35" width="772" height="525" fill="none" stroke="#334155" stroke-width="1" rx="8" />

  <!-- Header Title -->
  <text x="421" y="90" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="url(#goldGrad)" letter-spacing="4">{{title}}</text>
  <text x="421" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" letter-spacing="2">THIS IS PROUDLY PRESENTED TO</text>

  <!-- Recipient -->
  <text x="421" y="170" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">{{recipientName}}</text>
  <line x1="260" y1="185" x2="582" y2="185" stroke="#38bdf8" stroke-width="2" />

  <!-- Description -->
  <text x="421" y="215" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">{{awardDescription}}</text>

  <!-- Dynamic Vector Table of Completed Modules -->
  <g id="table-area" transform="translate(71, 245)">
    <rect x="0" y="0" width="700" height="32" rx="4" fill="#0284c7" />
    <text x="20" y="21" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">CODE</text>
    <text x="160" y="21" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">MODULE DESCRIPTION</text>
    <text x="500" y="21" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">GRADE</text>
    <text x="620" y="21" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">CREDITS</text>

    {{#items}}
    <g class="row" transform="translate(0, 0)">
      <rect x="0" y="32" width="700" height="28" fill="#1e293b" stroke="#334155" stroke-width="0.5" />
      <text x="20" y="50" font-family="system-ui, sans-serif" font-size="11" fill="#38bdf8">{{code}}</text>
      <text x="160" y="50" font-family="system-ui, sans-serif" font-size="11" fill="#f1f5f9">{{module}}</text>
      <text x="500" y="50" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#4ade80">{{grade}}</text>
      <text x="620" y="50" font-family="system-ui, sans-serif" font-size="11" fill="#cbd5e1">{{credits}}</text>
    </g>
    {{/items}}
  </g>

  <!-- Signatures & Footer -->
  <g transform="translate(100, 480)">
    <line x1="0" y1="0" x2="200" y2="0" stroke="#64748b" stroke-width="1" />
    <text x="100" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Academic Director</text>
  </g>

  <g transform="translate(542, 480)">
    <line x1="0" y1="0" x2="200" y2="0" stroke="#64748b" stroke-width="1" />
    <text x="100" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Date: {{date}}</text>
  </g>
</svg>`
    }
  },
  {
    id: 'docx-report',
    name: 'DOCX - Word Document Template',
    description: 'Microsoft Word template with table placeholders {#items}...{/items} filled and rendered to PDF.',
    params: {
      type: 'docx',
      url: 'https://raw.githubusercontent.com/open-xml-templates/samples/main/employee_roster.docx',
      data: [
        { name: "Sarah Jenkins", role: "Principal Systems Engineer", department: "Infrastructure", email: "sarah.j@company.org" },
        { name: "Marcus Chen", role: "Lead UI/UX Designer", department: "Product Design", email: "marcus.c@company.org" },
        { name: "Elena Rostova", role: "Senior Security Specialist", department: "InfoSec", email: "elena.r@company.org" },
        { name: "David Kim", role: "Full Stack Engineer", department: "Web Apps", email: "david.k@company.org" }
      ],
      config: {
        title: "Department Personnel Summary",
        pageSize: "A4",
        orientation: "portrait",
        primaryColor: "#0284c7"
      }
    }
  }
];
