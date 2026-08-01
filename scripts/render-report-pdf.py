#!/usr/bin/env python3
import argparse
import calendar
import html
import json
import os
import sys
from pathlib import Path


def load_pdf_dependencies():
    try:
        import pdfplumber
        from pypdf import PdfReader
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            CondPageBreak,
            Image,
            KeepTogether,
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
        from reportlab.pdfgen import canvas
    except ModuleNotFoundError as error:
        raise SystemExit(
            "PDF tooling unavailable. Install reportlab, pdfplumber and pypdf "
            "or set REPORTS_PYTHON to an interpreter that provides them."
        ) from error

    return {
        "pdfplumber": pdfplumber,
        "PdfReader": PdfReader,
        "colors": colors,
        "TA_CENTER": TA_CENTER,
        "A4": A4,
        "ParagraphStyle": ParagraphStyle,
        "getSampleStyleSheet": getSampleStyleSheet,
        "mm": mm,
        "Image": Image,
        "KeepTogether": KeepTogether,
        "CondPageBreak": CondPageBreak,
        "PageBreak": PageBreak,
        "Paragraph": Paragraph,
        "SimpleDocTemplate": SimpleDocTemplate,
        "Spacer": Spacer,
        "Table": Table,
        "TableStyle": TableStyle,
        "canvas": canvas,
    }


PDF = load_pdf_dependencies()


def clean_text(value):
    return (
        str(value)
        .replace("\u00a0", " ")
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2192", "->")
    )


def paragraph_text(value):
    return html.escape(clean_text(value)).replace("\n", "<br/>")


def build_styles():
    styles = PDF["getSampleStyleSheet"]()
    ParagraphStyle = PDF["ParagraphStyle"]
    colors = PDF["colors"]
    TA_CENTER = PDF["TA_CENTER"]

    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=29,
            leading=32,
            textColor=colors.HexColor("#111817"),
            spaceAfter=10,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=19,
            textColor=colors.HexColor("#153638"),
            spaceAfter=18,
        ),
        "edition": ParagraphStyle(
            "ReportEdition",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#9A7A45"),
            spaceAfter=10,
            uppercase=True,
        ),
        "h1": ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#111817"),
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "SubsectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#153638"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "MinorHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#9A7A45"),
            spaceBefore=7,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#414844"),
            spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#555D58"),
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#555D58"),
            spaceAfter=5,
        ),
        "url": ParagraphStyle(
            "Url",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#153638"),
            wordWrap="CJK",
        ),
        "disclaimer": ParagraphStyle(
            "Disclaimer",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=12,
            leftIndent=8,
            borderColor=colors.HexColor("#9A7A45"),
            borderWidth=0,
            borderPadding=6,
            textColor=colors.HexColor("#555D58"),
        ),
    }


def p(value, style):
    return PDF["Paragraph"](paragraph_text(value), style)


def bullet(value, styles):
    return PDF["Paragraph"](
        f"&#8226;&nbsp; {paragraph_text(value)}",
        styles["body"],
    )


def info_table(rows, styles, widths=None):
    Table = PDF["Table"]
    TableStyle = PDF["TableStyle"]
    colors = PDF["colors"]
    data = [[p(label, styles["small"]), p(value, styles["body"])] for label, value in rows]
    table = Table(data, colWidths=widths or [42 * PDF["mm"], 125 * PDF["mm"]], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EFEAE0")),
                ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8D2C6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D8D2C6")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def data_table(headers, rows, styles, widths=None):
    Table = PDF["Table"]
    TableStyle = PDF["TableStyle"]
    colors = PDF["colors"]
    data = [[p(value, styles["small"]) for value in headers]]
    data.extend([[p(value, styles["small"]) for value in row] for row in rows])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#153638")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8D2C6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D8D2C6")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F4EC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def calendar_time_label(item):
    if item.get("dateConfirmationStatus") == "editorial-unconfirmed":
        return "Fecha prevista editorial no confirmada · hora por confirmar"
    if item.get("timeStatus") == "tba":
        return f"Hora por confirmar · {item.get('originalTimeZone', 'Zona por confirmar')}"
    parts = []
    if item.get("originalTime") and item.get("originalTimeZone"):
        parts.append(f"{item['originalTime']} {item['originalTimeZone']}")
    if item.get("displayTimeCest"):
        parts.append(item["displayTimeCest"])
    return " · ".join(parts) or "Hora por confirmar"


def earnings_schedule_label(item):
    if item.get("dateConfirmationStatus") == "editorial-unconfirmed":
        return "Fecha prevista editorial no confirmada · hora por confirmar"
    if item.get("timeConfirmationStatus") != "confirmed":
        return "Fecha confirmada · hora por confirmar" if item.get("timeConfirmationStatus") == "unconfirmed" else "Fecha confirmada · hora no registrada"
    time_label = " · ".join(filter(None, [item.get("originalTime"), item.get("originalTimeZone"), item.get("displayTime")]))
    if time_label:
        return time_label
    if item.get("session") == "before-open":
        return "Fecha y sesión confirmadas · antes de apertura"
    if item.get("session") == "after-close":
        return "Fecha y sesión confirmadas · después del cierre"
    return "Fecha confirmada · hora no registrada"


def add_earnings_trace(story, items, styles):
    for item in items:
        lines = [
            f"Movimiento implícito: {item['impliedMoveProvider']} — {item['ticker']} · {item['impliedMoveProviderHref']} · consulta {item['consultedAt']}",
            f"Fecha y hora: {item['dateTimeSourceLabel']} · {item['dateTimeSourceHref']} · {earnings_schedule_label(item)}",
        ]
        if item.get("actualMoveSourceHref") and item.get("actualMoveSourceLabel"):
            lines.append(f"Movimiento ocurrido: {item['actualMoveSourceLabel']} · {item['actualMoveSourceHref']}" + (f" · {item['actualMoveMethodology']}" if item.get("actualMoveMethodology") else ""))
        else:
            lines.append("Movimiento ocurrido: pendiente de publicación.")
        story.append(PDF["KeepTogether"]([p(f"{item['company']} ({item['ticker']})", styles["h3"]), *[p(line, styles["small"]) for line in lines]]))


def add_monthly_calendar(story, items, styles, presentation):
    Table = PDF["Table"]
    TableStyle = PDF["TableStyle"]
    colors = PDF["colors"]
    mm = PDF["mm"]
    year = int(presentation["year"])
    month = int(presentation["month"])
    title = presentation.get("localizedTitle") or f"{year}-{month:02d}"
    prefix = f"{year}-{month:02d}-"
    first_weekday, day_count = calendar.monthrange(year, month)
    by_day = {}
    for item in items:
        if item.get("dateStart", "").startswith(prefix):
            day = int(item["dateStart"][-2:])
            by_day.setdefault(day, []).append(item)
    cell_count = ((first_weekday + day_count + 6) // 7) * 7
    cells = []
    for index in range(cell_count):
        day = index - first_weekday + 1
        if day < 1 or day > day_count:
            cells.append(p(" ", styles["small"]))
            continue
        lines = [str(day)]
        for item in by_day.get(day, []):
            lines.append(item.get("ticker", item["event"]))
        cells.append(p("\n".join(lines), styles["small"]))
    data = [[p(day, styles["small"]) for day in ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]]]
    data.extend([cells[row : row + 7] for row in range(0, cell_count, 7)])
    table = Table(data, colWidths=[24 * mm] * 7, repeatRows=1, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#153638")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8D2C6")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D8D2C6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for column in (5, 6):
        commands.append(("BACKGROUND", (column, 1), (column, -1), colors.HexColor("#F2EDE4")))
    table.setStyle(TableStyle(commands))
    story.append(p(title, styles["h2"]))
    story.append(table)
    story.append(PDF["Spacer"](1, 7))
    story.append(p("Detalle y leyenda", styles["h2"]))
    for item in items:
        source = item.get("sourceLabel", "Fuente institucional no indicada")
        source_href = item.get("sourceHref")
        tracking_label = item.get("trackingLabel")
        tracking_href = item.get("trackingHref")
        if tracking_href and tracking_href.startswith("/"):
            tracking_href = f"https://www.luiguiherrera.com{tracking_href}"
        story.append(
            PDF["KeepTogether"](
            [
                p(f"{item['dateLabel']} · {calendar_time_label(item)}", styles["h3"]),
                p(f"{item['event']}. {item['whyItMatters']}", styles["body"]),
                p(f"Activos o factores: {', '.join(item.get('affectedAssets', [])) or 'No especificados'}", styles["small"]),
                p(f"Fuente: {source}{f' · {source_href}' if source_href else ''}", styles["small"]),
                *([p(f"Movimiento implícito esperado: {'aproximadamente ' if item.get('impliedMoveApproximate') else ''}±{item['impliedMovePct']:.2f}% · Proveedor: {item.get('impliedMoveProvider', 'No indicado')}", styles["small"])] if item.get("impliedMovePct") is not None else []),
                *(
                    [p(f"Seguimiento: {tracking_label} · {tracking_href}", styles["small"])]
                    if tracking_label and tracking_href
                    else []
                ),
                PDF["Spacer"](1, 5),
            ]
            )
        )


def add_asset_reading(story, item, styles, allow_table_split=False, enhanced_timeline=False):
    rows = [
        ("Clasificación", item["badge"]),
        ("Qué pasó", item["story"]),
        ("Qué cambió", item["changed"]),
        ("Qué esperamos", item["expected"]),
        ("Qué vigilar", item["watch"]),
        ("Lectura del informe", item["reading"]),
        (
            "Secuencia",
            " ".join(
                [
                    f"Antes - Contexto: {item['timeline']['before']}" if enhanced_timeline else item["timeline"]["before"],
                    f"Ahora - Qué cambió: {item['timeline']['now']}" if enhanced_timeline else item["timeline"]["now"],
                    f"Después - Qué vigilamos: {item['timeline']['next']}" if enhanced_timeline else item["timeline"]["next"],
                ]
            ),
        ),
    ]
    if allow_table_split:
        story.append(PDF["CondPageBreak"](65 * PDF["mm"]))
        story.append(
            PDF["KeepTogether"](
                [
                    p(item["asset"], styles["h2"]),
                    p(item["headline"], styles["body"]),
                ]
            )
        )
        story.append(info_table(rows, styles))
        story.append(PDF["Spacer"](1, 7))
        return

    story.append(
        PDF["KeepTogether"](
            [
                p(item["asset"], styles["h2"]),
                p(item["headline"], styles["body"]),
                info_table(rows, styles),
                PDF["Spacer"](1, 7),
            ]
        )
    )


def add_snapshot_group(story, title, content, styles):
    story.append(
        PDF["KeepTogether"](
            [
                p(title, styles["h2"]),
                content,
            ]
        )
    )


def add_historical_snapshot(story, snapshot, styles):
    story.append(p("Snapshot histórico congelado", styles["h2"]))
    story.append(
        p(
            f"Datos conservados con corte a {snapshot['dataDate']}. "
            "Las cifras reproducen el estado publicado y no representan datos vigentes.",
            styles["body"],
        )
    )
    regime = snapshot["regime"]
    story.append(
        info_table(
            [
                ("Régimen al corte", regime["label"]),
                ("Score", "No disponible al cierre" if regime["score"] is None else f"{regime['score']}/100"),
                ("Confianza", "No disponible al cierre" if regime["confidence"] is None else f"{regime['confidence']}%"),
                ("Sesgo", regime["bias"]),
                ("Interpretación histórica", regime["interpretation"]),
            ],
            styles,
        )
    )
    for title, key in [
        ("Qué impulsó", "support"),
        ("Qué frenó", "caution"),
        ("Qué vigilar", "watch"),
    ]:
        story.append(p(title, styles["h3"]))
        for value in regime[key]:
            story.append(bullet(value, styles))

    add_snapshot_group(
        story,
        "Índices principales vía ETF",
        data_table(
            ["Ticker", "Retorno 1W", "Media larga", "Distancia a máximos"],
            [
                [
                    item["ticker"],
                    f"{item['return1w']:+.1f}%",
                    f"{item['distanceLongAverage']:+.1f}%",
                    f"{item['distanceFromHigh']:+.1f}%",
                ]
                for item in snapshot["indices"]
            ],
            styles,
            [28 * PDF["mm"], 40 * PDF["mm"], 46 * PDF["mm"], 52 * PDF["mm"]],
        ),
        styles,
    )

    sectors = snapshot["sectors"]
    add_snapshot_group(
        story,
        "Rotación sectorial",
        info_table(
            [
                ("Sectores positivos", f"{sectors['positiveCount']} / {sectors['totalCount']}"),
                ("Sectores negativos", str(sectors["negativeCount"])),
                ("Dispersión 1W", f"{sectors['dispersion1w']:+.1f}%"),
                ("Lectura al publicar", sectors["reading"]),
            ],
            styles,
        ),
        styles,
    )
    story.append(
        data_table(
            ["Grupo", "Ticker", "Nombre", "Retorno 1W"],
            [
                ["Líder", item["ticker"], item["name"], f"{item['return1w']:+.1f}%"]
                for item in sectors["leaders"]
            ]
            + [
                ["Rezagado", item["ticker"], item["name"], f"{item['return1w']:+.1f}%"]
                for item in sectors["laggards"]
            ],
            styles,
            [28 * PDF["mm"], 24 * PDF["mm"], 82 * PDF["mm"], 34 * PDF["mm"]],
        )
    )

    vix = snapshot["vix"]
    if vix:
        add_snapshot_group(
            story,
            "VIX - Volatilidad al corte",
        info_table(
            [
                ("Nivel al corte", f"{vix['level']:.1f}"),
                ("Cambio 1D", f"{vix['change1d']:+.1f}"),
                ("Estado", f"{vix['stateLabel']} / {vix['status']}"),
                ("Momentum", vix["momentum"]),
                ("Curva", vix["curve"]),
                ("Lectura histórica", vix["curveText"]),
            ],
            styles,
        ),
            styles,
        )
    else:
        story.append(p("VIX - Volatilidad al corte", styles["h2"]))
        story.append(p("No disponible al cierre.", styles["body"]))

    btc = snapshot["btcEtfFlows"]
    if btc:
        add_snapshot_group(
        story,
        "Flujos netos de ETFs de BTC al corte",
        info_table(
            [
                ("Último día", f"{btc['lastDayUsdMillions']:+.0f} M USD"),
                ("Rolling 5D", f"{btc['rolling5dUsdMillions']:+.0f} M USD"),
                ("Racha", btc["streakLabel"]),
                ("Lectura al publicar", btc["reading"]),
            ],
            styles,
        ),
            styles,
        )
    else:
        story.append(p("Flujos netos de ETFs de BTC al corte", styles["h2"]))
        story.append(p("No disponible al cierre.", styles["body"]))

    gld = snapshot["gldFlowPressure"]
    if gld:
        add_snapshot_group(
        story,
        "Proxy histórico de presión de flujos en GLD",
        info_table(
            [
                ("Fecha del dato", gld["asOf"]),
                ("Proxy al corte", gld["label"]),
                ("Cambio 5D en participaciones", f"{gld['sharesChange5dPct']:+.2f}%"),
                ("Resumen", gld["summary"]),
                ("Limitación de fuente", gld["sourceNote"]),
            ],
            styles,
        ),
            styles,
        )
    else:
        story.append(p("Proxy histórico de presión de flujos en GLD", styles["h2"]))
        story.append(p("No disponible al cierre.", styles["body"]))

    add_snapshot_group(
        story,
        "Lecturas automáticas de activos al corte",
        data_table(
            ["Activo", "Percentil", "Z-score", "Media larga", "Último cierre"],
            [
                [
                    f"{asset['label']} ({asset.get('symbol', asset['label'])})",
                    f"{asset['percentile']:.1f}",
                    f"{asset['zScore']:.2f}",
                    f"{asset['distanceLongAverage']:+.1f}%",
                    f"{asset['lastClose']:.0f}" if asset["label"] == "BTC" else f"{asset['lastClose']:.2f}",
                ]
                for asset in snapshot["statisticalAssets"]
            ],
            styles,
            [48 * PDF["mm"], 30 * PDF["mm"], 30 * PDF["mm"], 35 * PDF["mm"], 34 * PDF["mm"]],
        ),
        styles,
    )


def add_figure(story, item, styles, root):
    source_path = item["src"]
    if source_path.startswith("/"):
        source_path = Path(root) / "public" / source_path.lstrip("/")
    else:
        source_path = Path(root) / source_path
    if not source_path.exists():
        raise SystemExit(f"Figure not found: {source_path}")

    image = PDF["Image"](str(source_path))
    max_width = 170 * PDF["mm"]
    max_height = 145 * PDF["mm"]
    scale = min(max_width / image.imageWidth, max_height / image.imageHeight)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    image.hAlign = "CENTER"
    caption = f"{item['asset']}. {item['caption']}"
    source = item["source"]
    if item.get("note"):
        source = f"{source} {item['note']}"
    story.append(
        PDF["KeepTogether"](
            [
                p(item["asset"], styles["h2"]),
                image,
                PDF["Spacer"](1, 5),
                p(caption, styles["caption"]),
                p(source, styles["caption"]),
            ]
        )
    )
    story.append(PDF["Spacer"](1, 8))


def add_section(story, section, styles, root, published_at, description, force_break, model):
    kind = section["kind"]
    presentation = model.get("presentation", {})
    enhanced_timeline = presentation.get("timelineStyle") == "progression"
    enhanced_calendar = presentation.get("calendarStyle") == "monthly"
    enhanced_watchlist = presentation.get("watchlistStyle") == "dashboard"
    story.append(
        PDF["PageBreak"]()
        if force_break
        or kind == "figures"
        or (enhanced_watchlist and kind == "sources")
        else PDF["CondPageBreak"](55 * PDF["mm"])
    )
    story.append(p(section["title"], styles["h1"]))

    if kind == "narrative":
        story.append(p(section["body"], styles["body"]))
    elif kind == "summary":
        for item in section["items"]:
            story.append(
                PDF["KeepTogether"](
                    [
                        p(item["title"], styles["h2"]),
                        p(item["text"], styles["body"]),
                    ]
                )
            )
        if section.get("transversalFactor"):
            factor = section["transversalFactor"]
            story.append(p(factor.get("label", "Factor transversal"), styles["h3"]))
            story.append(p(factor["title"], styles["h2"]))
            story.append(p(factor["text"], styles["body"]))
    elif kind == "context":
        for item in section["items"]:
            story.append(p(item["title"], styles["h2"]))
            story.append(p(item["summary"], styles["small"]))
            story.append(p(item["body"], styles["body"]))
    elif kind == "asset-readings":
        for item in section["items"]:
            add_asset_reading(
                story,
                item,
                styles,
                allow_table_split=enhanced_timeline,
                enhanced_timeline=enhanced_timeline,
            )
            if item.get("detailsModule") == "earnings" and section.get("stockpicking"):
                earnings = section["stockpicking"]["earnings"]
                story.append(p("Qué pasó — resultados publicados", styles["h2"]))
                story.append(data_table(["Fecha", "Empresa", "Implícito", "Ocurrido", "Lectura"], [[row["reportDate"], f"{row['company']} ({row['ticker']})", f"{'≈' if row.get('impliedMoveApproximate') else ''}±{row['impliedMovePct']:.2f}%", f"{row['actualMovePct']:.1f}%", "Excedió el rango" if abs(row["actualMovePct"]) > row["impliedMovePct"] else "Dentro del rango"] for row in earnings["published"]], styles, [26*PDF["mm"], 55*PDF["mm"], 28*PDF["mm"], 27*PDF["mm"], 39*PDF["mm"]]))
                story.append(p("Trazabilidad — resultados publicados", styles["h2"]))
                add_earnings_trace(story, earnings["published"], styles)
                story.append(p("Qué esperamos — próximos resultados", styles["h2"]))
                story.append(data_table(["Fecha", "Empresa", "Implícito", "Hora / estado"], [[row["reportDate"], f"{row['company']} ({row['ticker']})", f"{'≈' if row.get('impliedMoveApproximate') else ''}±{row['impliedMovePct']:.2f}%", earnings_schedule_label(row)] for row in earnings["upcoming"]], styles, [27*PDF["mm"], 62*PDF["mm"], 31*PDF["mm"], 55*PDF["mm"]]))
                story.append(p("Trazabilidad — próximos resultados", styles["h2"]))
                add_earnings_trace(story, earnings["upcoming"], styles)
                story.append(p(earnings["methodology"] + " Cada fila identifica la página por ticker, la fecha de consulta y las fuentes utilizadas para fecha, hora y reacción.", styles["small"]))
    elif kind == "historical-snapshot":
        add_historical_snapshot(story, section["snapshot"], styles)
    elif kind == "figures":
        for item in section["items"]:
            add_figure(story, item, styles, root)
    elif kind == "calendar-scenarios":
        story.append(p("Eventos y ventanas editoriales", styles["h2"]))
        if enhanced_calendar:
            add_monthly_calendar(story, section["calendar"], styles, presentation)
        else:
            for item in section["calendar"]:
                story.append(
                    PDF["KeepTogether"](
                        [
                            p(item["dateLabel"], styles["h3"]),
                            p(f"{item['event']}. {item['whyItMatters']}", styles["body"]),
                        ]
                    )
                )
        story.append(p("Escenarios", styles["h2"]))
        for item in section["scenarios"]:
            if enhanced_calendar:
                story.append(
                    PDF["KeepTogether"](
                        [
                            p(item["title"], styles["h3"]),
                            p(item["body"], styles["body"]),
                        ]
                    )
                )
            else:
                story.append(p(item["title"], styles["h3"]))
                story.append(p(item["body"], styles["body"]))
    elif kind == "probable-routes":
        story.append(p(section["routes"]["note"], styles["body"]))
        story.append(p("Motores", styles["h2"]))
        for item in section["routes"]["engines"]:
            story.append(PDF["KeepTogether"]([p(item["title"], styles["h3"]), p(item["body"], styles["body"])]))
        story.append(p("Escenarios", styles["h2"]))
        for item in section["routes"]["scenarios"]:
            story.append(PDF["KeepTogether"]([p(item["title"], styles["h3"]), p(item["body"], styles["body"])]))
    elif kind == "watchlist":
        for item_index, item in enumerate(section["items"]):
            reading_label = "Lectura al publicar" if item.get("currentReading") else "Lectura de seguimiento"
            if enhanced_watchlist and item_index and item_index % 2 == 0:
                story.append(PDF["PageBreak"]())
            story.append(
                PDF["KeepTogether"](
                    [
                        p(item["name"], styles["h2"]),
                        *(
                            [PDF["Spacer"](1, 3 * PDF["mm"])]
                            if enhanced_watchlist
                            else []
                        ),
                        info_table(
                            [
                                *(
                                    [
                                        (
                                            "Categoría",
                                            {
                                                "market-structure": "Estructura de mercado",
                                                "rates-credit": "Tasas y crédito",
                                                "technology-ai": "Tecnología e IA",
                                                "fx-commodities": "Divisas y materias primas",
                                            }.get(item.get("category"), "Seguimiento"),
                                        )
                                    ]
                                    if enhanced_watchlist
                                    else []
                                ),
                                ("Estado", item.get("statusLabel", "Seguimiento")),
                                ("Qué mira", item["whatLooksAt"]),
                                ("Por qué importa", item["whyItMatters"]),
                                (
                                    reading_label,
                                    item.get(
                                        "currentReading",
                                        "Lectura editorial de seguimiento basada en el contexto del informe.",
                                    ),
                                ),
                                (
                                    "Qué cambiaría",
                                    item.get(
                                        "whatWouldChange",
                                        "La lectura cambiaría si el comportamiento observado contradice la tesis principal.",
                                    ),
                                ),
                                ("Fecha", item.get("asOf", published_at)),
                                ("Fuente", item.get("source", description)),
                                *(
                                    [
                                        (
                                            "Seguimiento",
                                            f"{item.get('linkLabel', 'Seguimiento institucional')}: {item['href']}"
                                            if item.get("href")
                                            else "Seguimiento institucional no disponible públicamente.",
                                        )
                                    ]
                                    if enhanced_watchlist
                                    else []
                                ),
                            ],
                            styles,
                        ),
                        PDF["Spacer"](1, 7),
                    ]
                )
            )
    elif kind == "sources":
        story.append(p("Fuentes y método", styles["h2"]))
        story.append(p(section["sourcesNote"], styles["body"]))
        story.append(p("Limitaciones y aviso educativo", styles["h2"]))
        story.append(p(section["disclaimer"], styles["disclaimer"]))
    else:
        raise SystemExit(f"Unsupported section kind: {kind}")


def deterministic_canvas(filename, **kwargs):
    kwargs.pop("invariant", None)
    kwargs.pop("pageCompression", None)
    return PDF["canvas"].Canvas(filename, invariant=1, pageCompression=1, **kwargs)


def generate_pdf(model_path, output_path, root):
    model = json.loads(Path(model_path).read_text(encoding="utf-8"))
    styles = build_styles()
    mm = PDF["mm"]
    doc = PDF["SimpleDocTemplate"](
        str(output_path),
        pagesize=PDF["A4"],
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=19 * mm,
        title=clean_text(model["title"]),
        author=model["author"],
        subject=clean_text(model["description"]),
        creator="Luigui Herrera report generator",
    )

    story = [
        PDF["Spacer"](1, 35 * mm),
        p(model["editionName"].upper(), styles["edition"]),
        p(model["title"], styles["title"]),
        p(model["subtitle"], styles["subtitle"]),
        info_table(
            [
                ("Autor", model["author"]),
                ("Publicación", model["publishedAt"]),
                ("Actualización", model["modifiedAt"]),
                ("Corte editorial", model.get("editorialCutoffAt", "No aplica")),
                ("Corte de datos automáticos", model.get("automaticDataCutoffAt", "No aplica")),
                ("URL editorial primaria", model["canonicalUrl"]),
            ],
            styles,
        ),
        PDF["Spacer"](1, 10),
        p(model["sections"][-1]["disclaimer"], styles["disclaimer"]),
    ]

    for index, section in enumerate(model["sections"]):
        add_section(
            story,
            section,
            styles,
            root,
            model["publishedAt"],
            model["description"],
            index == 0,
            model,
        )

    def page_decor(canvas_obj, doc_obj):
        canvas_obj.saveState()
        canvas_obj.setTitle(clean_text(model["title"]))
        canvas_obj.setAuthor(model["author"])
        canvas_obj.setSubject(clean_text(model["description"]))
        canvas_obj.setCreator("Luigui Herrera report generator")
        canvas_obj.setStrokeColor(PDF["colors"].HexColor("#D8D2C6"))
        canvas_obj.setLineWidth(0.4)
        canvas_obj.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
        canvas_obj.setFillColor(PDF["colors"].HexColor("#6E7471"))
        canvas_obj.setFont("Helvetica", 7)
        canvas_obj.drawString(18 * mm, 9 * mm, "Luigui Herrera")
        canvas_obj.drawRightString(192 * mm, 9 * mm, f"{doc_obj.page}")
        canvas_obj.restoreState()

    doc.build(
        story,
        onFirstPage=page_decor,
        onLaterPages=page_decor,
        canvasmaker=deterministic_canvas,
    )


def inspect_pdf(pdf_path):
    reader = PDF["PdfReader"](str(pdf_path))
    metadata = reader.metadata or {}
    page_texts = []
    with PDF["pdfplumber"].open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            page_texts.append(page.extract_text() or "")

    payload = {
        "pages": len(reader.pages),
        "metadata": {
            "title": metadata.get("/Title", ""),
            "author": metadata.get("/Author", ""),
            "subject": metadata.get("/Subject", ""),
        },
        "pageTextLengths": [len(value.strip()) for value in page_texts],
        "blankPages": [index + 1 for index, value in enumerate(page_texts) if len(value.strip()) < 20],
        "text": "\n\n".join(page_texts),
    }
    print(json.dumps(payload, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    generate = subparsers.add_parser("generate")
    generate.add_argument("model")
    generate.add_argument("output")
    generate.add_argument("root")

    inspect = subparsers.add_parser("inspect")
    inspect.add_argument("pdf")

    args = parser.parse_args()
    if args.command == "generate":
        generate_pdf(args.model, args.output, args.root)
    else:
        inspect_pdf(args.pdf)


if __name__ == "__main__":
    main()
