# -*- coding: utf-8 -*-
"""Build TRON AI final 5-slide Japanese PPTX from verified project evidence only."""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu

ROOT = Path(r"C:\Users\engrm\OneDrive\Desktop\Group7")
OUT_PPTX = ROOT / "TRON_AI_FINAL_PRESENTATION.pptx"

# Visual system — deep teal / slate (avoid purple/cream AI clichés)
BG = RGBColor(0x0B, 0x1C, 0x24)
PANEL = RGBColor(0x12, 0x2B, 0x36)
ACCENT = RGBColor(0x2A, 0x9D, 0x8F)
ACCENT2 = RGBColor(0xE9, 0xC4, 0x6A)
TEXT = RGBColor(0xF1, 0xFA, 0xEE)
MUTED = RGBColor(0xA8, 0xC0, 0xC8)
WARN = RGBColor(0xF4, 0xA2, 0x61)


def set_run(run, size=14, bold=False, color=TEXT, font="Yu Gothic UI"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_bg(slide, prs):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = BG
    shape.line.fill.background()


def add_accent_bar(slide, prs):
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), prs.slide_height
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT
    bar.line.fill.background()
    top = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.08)
    )
    top.fill.solid()
    top.fill.fore_color.rgb = ACCENT2
    top.line.fill.background()


def add_footer(slide, prs, page: int):
    box = slide.shapes.add_textbox(
        Inches(0.4), prs.slide_height - Inches(0.45), Inches(12.2), Inches(0.35)
    )
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = f"TRON AI 最終発表  |  約10分  |  LANデモ（本番デプロイなし）  |  {page}/5"
    set_run(p.runs[0], 10, False, MUTED)


def add_title(slide, text: str, subtitle: str | None = None):
    box = slide.shapes.add_textbox(Inches(0.45), Inches(0.25), Inches(12.2), Inches(0.7))
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = text
    set_run(p.runs[0], 28, True, TEXT)
    if subtitle:
        box2 = slide.shapes.add_textbox(
            Inches(0.45), Inches(0.85), Inches(12.2), Inches(0.4)
        )
        p2 = box2.text_frame.paragraphs[0]
        p2.text = subtitle
        set_run(p2.runs[0], 12, False, MUTED)


def panel(slide, left, top, width, height):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = PANEL
    shape.line.color.rgb = RGBColor(0x1E, 0x4A, 0x58)
    shape.line.width = Pt(1)
    try:
        shape.adjustments[0] = 0.08
    except Exception:
        pass
    return shape


def add_bullets(slide, left, top, width, height, lines, size=13):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    first = True
    for line in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.text = line if line else " "
        p.level = 0
        p.space_after = Pt(6)
        if not p.runs:
            run = p.add_run()
            run.text = p.text
        set_run(p.runs[0], size, False, TEXT)
    return box


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # ─── Slide 1 ───
    s1 = prs.slides.add_slide(blank)
    add_bg(s1, prs)
    add_accent_bar(s1, prs)
    add_title(
        s1,
        "TRON AI — プロジェクト紹介 & チーム",
        "専門学校・新卒向けキャリア／面接支援 AI  |  GitHub: tron-ai-team/terafes_07",
    )
    panel(s1, Inches(0.45), Inches(1.4), Inches(7.6), Inches(5.2))
    add_bullets(
        s1,
        Inches(0.65),
        Inches(1.55),
        Inches(7.2),
        Inches(4.9),
        [
            "【概要】Webのキャリア支援 + PC上のDesktop Agent（任意）",
            "【目的】履歴書・面接・企業研究・AI対話を一つの体験に統合",
            "",
            "【技術スタック（実運用）】",
            "・Frontend: React 19 + TypeScript + Vite（:5174）",
            "・Backend: Java 21 + Spring Boot（:8080 / 127.0.0.1）",
            "・DB: MySQL + Flyway",
            "・AI: Ollama（例: qwen3:8b）+ AI Gateway",
            "・Desktop: JavaFX + OpenCode + Playwright helper",
            "",
            "【起動】START_TRON.cmd → scripts\\Start-Tron.ps1",
        ],
        14,
    )
    panel(s1, Inches(8.3), Inches(1.4), Inches(4.5), Inches(5.2))
    add_bullets(
        s1,
        Inches(8.5),
        Inches(1.55),
        Inches(4.1),
        Inches(4.9),
        [
            "【チーム体制】",
            "",
            "Thushan",
            "  アーキテクチャ＆統合",
            "",
            "Nayam",
            "  バックエンド（Spring / MySQL / AI）",
            "",
            "Opu",
            "  Desktop Agent（JavaFX / WSS / OpenCode）",
            "",
            "Rakib",
            "  フロントエンド（React / UI）",
            "",
            "※役割はチーム申告に基づく",
        ],
        13,
    )
    add_footer(s1, prs, 1)

    # ─── Slide 2 ───
    s2 = prs.slides.add_slide(blank)
    add_bg(s2, prs)
    add_accent_bar(s2, prs)
    add_title(s2, "対象ユーザー & 解決したい課題", "出典: TRON_PUBLIC_PRODUCT_ARCHITECTURE / Master Report")
    panel(s2, Inches(0.45), Inches(1.35), Inches(6.0), Inches(5.3))
    add_bullets(
        s2,
        Inches(0.65),
        Inches(1.5),
        Inches(5.6),
        Inches(5.0),
        [
            "【対象ユーザー】",
            "・日本の専門学校生・新卒候補者",
            "・履歴書・面接準備に時間がかかる学生",
            "・PC上の開発作業もAIに任せたい学習者",
            "",
            "【課題】",
            "・情報・ツールが分散（求人 / 履歴書 / 面接）",
            "・事実と異なる経歴の生成リスク",
            "・クラウド依存だけではローカル実習が困難",
            "・PC操作エージェントの認可・安全境界が必要",
        ],
        14,
    )
    panel(s2, Inches(6.7), Inches(1.35), Inches(6.1), Inches(5.3))
    add_bullets(
        s2,
        Inches(6.9),
        Inches(1.5),
        Inches(5.7),
        Inches(5.0),
        [
            "【TRON の答え（2ドメイン）】",
            "",
            "① Web & Cloud Services",
            "  ログイン直後から利用可能",
            "  Chat / Career / Interview / CV",
            "  Desktop不要",
            "",
            "② Computer Agent Ecosystem",
            "  Desktop Agent 認可後のみ",
            "  ローカルファイル / Git / 端末",
            "  OpenCode / Playwright（ローカル）",
            "",
            "正直な空結果・承認ゲートを設計方針に採用",
        ],
        14,
    )
    add_footer(s2, prs, 2)

    # ─── Slide 3 ───
    s3 = prs.slides.add_slide(blank)
    add_bg(s3, prs)
    add_accent_bar(s3, prs)
    add_title(
        s3,
        "主要機能 & ライブデモ",
        "教室LAN: http://192.168.0.21:5174/  |  本番デプロイなし（RTX Windows）",
    )
    # Architecture diagram boxes
    boxes = [
        (0.5, 1.4, 2.4, 1.1, "同級生ブラウザ\nLAN :5174"),
        (3.3, 1.4, 2.6, 1.1, "Vite React\n同一オリジン /api"),
        (6.3, 1.4, 3.0, 1.1, "Spring Boot\n127.0.0.1:8080"),
        (9.7, 1.4, 3.0, 1.1, "MySQL / Ollama\nlocalhost のみ"),
    ]
    for left, top, w, h, label in boxes:
        sh = panel(s3, Inches(left), Inches(top), Inches(w), Inches(h))
        tb = s3.shapes.add_textbox(Inches(left + 0.1), Inches(top + 0.25), Inches(w - 0.2), Inches(h - 0.3))
        p = tb.text_frame.paragraphs[0]
        p.text = label
        p.alignment = PP_ALIGN.CENTER
        set_run(p.runs[0], 12, True, TEXT)

    # arrows as text
    for x in (2.95, 5.95, 9.35):
        t = s3.shapes.add_textbox(Inches(x), Inches(1.7), Inches(0.35), Inches(0.4))
        t.text_frame.paragraphs[0].text = "→"
        set_run(t.text_frame.paragraphs[0].runs[0], 18, True, ACCENT2)

    panel(s3, Inches(0.45), Inches(2.8), Inches(8.2), Inches(3.9))
    add_bullets(
        s3,
        Inches(0.65),
        Inches(2.95),
        Inches(7.8),
        Inches(3.6),
        [
            "【本日のデモ順（安定優先）】",
            "1. ログイン / ホーム（パスワード認証）",
            "2. AI Chat（ローカル Ollama）",
            "3. AI モデル / モード選択 UI",
            "4. Career / Interview UI",
            "5. Desktop Agent 接続 — 事前確認できた場合のみ",
            "",
            "【検証済み（本準備）】",
            "LAN Frontend 200 / /api プロキシ / 登録・JWT / AI models・modes / Career ops",
            "Backend・MySQL は LAN 非公開。Firewall: TCP 5174 ← 192.168.0.0/24",
        ],
        13,
    )
    panel(s3, Inches(8.9), Inches(2.8), Inches(3.9), Inches(3.9))
    add_bullets(
        s3,
        Inches(9.05),
        Inches(2.95),
        Inches(3.6),
        Inches(3.6),
        [
            "【制限】",
            "・マイクは HTTPS/localhost 制約",
            "・Google OAuth は localhost 設定依存",
            "・求人スクレイプ空配列あり得る（偽成功しない）",
            "・Desktop Agent は任意",
            "・本番 / Ubuntu / Cloudflare 未使用",
        ],
        12,
    )
    add_footer(s3, prs, 3)

    # ─── Slide 4 ───
    s4 = prs.slides.add_slide(blank)
    add_bg(s4, prs)
    add_accent_bar(s4, prs)
    add_title(
        s4,
        "AI支援開発: 実際のプロンプト・エラー・修正・検証",
        "出典: Hybrid API Report / Unit5 bug_reports / RTX Connectivity Report（捏造なし）",
    )
    panel(s4, Inches(0.4), Inches(1.3), Inches(4.1), Inches(5.4))
    add_bullets(
        s4,
        Inches(0.55),
        Inches(1.4),
        Inches(3.8),
        Inches(5.2),
        [
            "【実プロンプト例① — CV改善】",
            "入力（合成テスト）:",
            "「私はJavaとSpring Bootを勉強しました。いろいろなアプリを作りました。IT会社で働きたいです。」",
            "",
            "結果エンジン:",
            "GROQ/openai/gpt-oss-120b",
            "",
            "提案文（実測）:",
            "「JavaおよびSpring Bootを学習し、様々なアプリケーションを開発いたしました。…」",
            "",
            "検証: 黙って上書きせず PENDING→reject を実施",
        ],
        11,
    )
    panel(s4, Inches(4.7), Inches(1.3), Inches(4.1), Inches(5.4))
    add_bullets(
        s4,
        Inches(4.85),
        Inches(1.4),
        Inches(3.8),
        Inches(5.2),
        [
            "【実プロンプト例② — Ollama】",
            "prompt: Return only: READY",
            "model: qwen3:8b",
            "実測応答: [READY]",
            "",
            "【エラー → 修正】",
            "Bug-001: index.html を繰り返し修正",
            "→ AgentRunner repeatCount>=1 で fallback",
            "",
            "Bug-002: TERMINAL argv 欠落",
            "→ command からの tokenize フォールバック",
            "",
            "Firecrawl 429 → SafeUrlFetcher へ切替（実測）",
        ],
        11,
    )
    panel(s4, Inches(9.0), Inches(1.3), Inches(3.8), Inches(5.4))
    add_bullets(
        s4,
        Inches(9.15),
        Inches(1.4),
        Inches(3.5),
        Inches(5.2),
        [
            "【検証の作法】",
            "・モックと実測を報告書で区別",
            "・空の求人結果を偽成功にしない",
            "・秘密鍵をログに出さない",
            "",
            "【正直な欠落】",
            "メンバー個別 Units 1–6 の",
            "プロンプト日誌はリポジトリに",
            "揃っていない（Master Report §14）",
            "",
            "→ 本スライドは共有ミッション",
            "報告書の実測のみを使用",
        ],
        11,
    )
    add_footer(s4, prs, 4)

    # ─── Slide 5 ───
    s5 = prs.slides.add_slide(blank)
    add_bg(s5, prs)
    add_accent_bar(s5, prs)
    add_title(
        s5,
        "チーム振り返り & 学び",
        "個人の相互評価文はリポジトリ未整備 — 共有開発から得た学びのみ記載",
    )
    panel(s5, Inches(0.45), Inches(1.35), Inches(6.1), Inches(5.3))
    add_bullets(
        s5,
        Inches(0.65),
        Inches(1.5),
        Inches(5.7),
        Inches(5.0),
        [
            "【うまくいったこと】",
            "・START_TRON 一発起動でローカル統合が再現可能に",
            "・FastAPI から Spring Boot へのコア移行（MEGA01）",
            "・Career V1 API と React 画面の接続・E2E 証跡",
            "・CV AI assist の承認フロー（黙上書き禁止）",
            "・LAN では Vite 逆プロキシで Backend を非公開のまま公開",
            "",
            "【難しかったこと】",
            "・ハイブリッド AI / レート制限 / フォールバック設計",
            "・Desktop Agent・OpenCode の環境依存と完了検証",
            "・Firewall / Public NIC プロファイルの実害",
        ],
        13,
    )
    panel(s5, Inches(6.8), Inches(1.35), Inches(6.0), Inches(5.3))
    add_bullets(
        s5,
        Inches(7.0),
        Inches(1.5),
        Inches(5.6),
        Inches(5.0),
        [
            "【次に活かすこと】",
            "・機能追加より「検証可能な証跡」を先に残す",
            "・メンバー各自の AI プロンプト日誌を早期に揃える",
            "・デモは安定パス（Chat / Career UI）を優先",
            "・OpenClaw 等 BLOCKED 機能は PASS と述べない",
            "",
            "【提出・運用の確認】",
            "・発表約10分 / スライド5枚",
            "・教室デモ = RTX LAN（本番デプロイなし）",
            "・停止: STOP_TRON.cmd",
            "",
            "ご清聴ありがとうございました",
        ],
        13,
    )
    add_footer(s5, prs, 5)

    prs.save(OUT_PPTX)
    print(f"WROTE {OUT_PPTX}")


if __name__ == "__main__":
    build()
