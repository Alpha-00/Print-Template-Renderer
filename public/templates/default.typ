#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: "Liberation Sans", size: 10pt)

#grid(
  columns: (1fr, 1fr),
  [
    #text(size: 20pt, weight: "bold", fill: rgb("#0284c7"))[#config.at("title", default: "DOCUMENT SUMMARY")]
    
    #v(4pt)
    *Prepared For:* #config.at("clientName", default: "Default Client / Organization") \\
    *Date:* #config.at("date", default: "November 2026") \\
    *Status:* Approved
  ],
  align(right)[
    #text(size: 14pt, weight: "bold")[Honmyou Print Engine] \\
    Print Template Renderer \\
    honmyou.dev
  ]
)

#v(20pt)
#line(length: 100%, stroke: 1.5pt + rgb("#0284c7"))
#v(10pt)

#text(size: 12pt, weight: "bold")[Itemized Data Table]
#v(6pt)

#auto_table(data)

#v(25pt)
#align(center)[
  #text(fill: luma(120), size: 9pt)[Default project template. Provide a 'url' param to load an external template file.]
]
