# MCP — 기본 OFF (디자인 작업 시작 시 물어보고 켬)

> 정책: 아래 MCP들은 **평소 구동하지 않는다.** 활성 `.mcp.json`에 넣지 않았으므로 백그라운드에서 절대 돌지 않음.
> 디자인 개발을 시작할 때 Claude가 "MCP 켤까요?"라고 물어보고, **승인하면** 해당 블록을 `.mcp.json`에 넣어 활성화한다.
> 끌 때는 `.mcp.json`에서 블록을 빼면 됨.

---

## 1) shadcn MCP — React 컴포넌트 레지스트리 (키 불필요)

전제: React/Next.js + Tailwind 프로젝트 (`npx shadcn@latest init` 먼저). 정적 HTML엔 효과 없음.

켜기 — 프로젝트 루트 `.mcp.json`에 추가:
```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] }
  }
}
```
또는 한 줄: `claude mcp add shadcn -- npx shadcn@latest mcp`
확인: 재시작 후 `/mcp`에서 shadcn connected.

## 2) Higgsfield MCP — 이미지·영상 생성 (유료 키 필요, SeeDance/Veo3/Sora2 등)

전제(3가지):
1. `uv` 설치 (Python 패키지 매니저)
2. repo 클론: `git clone https://github.com/Hikhakk/higgsfield-mcp-unified`
3. 키 발급: platform.higgsfield.ai → `HIGGSFIELD_API_KEY`, `HIGGSFIELD_SECRET`

켜기 — `.mcp.json`에 추가 (경로/키 채우기):
```json
{
  "mcpServers": {
    "higgsfield": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/higgsfield-mcp-unified", "higgsfield-mcp"],
      "env": { "HIGGSFIELD_API_KEY": "...", "HIGGSFIELD_SECRET": "..." }
    }
  }
}
```

---

## 설치된 스킬 (MCP 아님 — 호출 시에만 로드, 상시 구동 없음)
- GSAP 공식 8종: gsap-core / scrolltrigger / timeline / plugins / performance / react / frameworks / utils
- ui-ux-pro-max (SwiftUI·Jetpack Compose(Material) 스택 내장 → 모바일 커버), frontend-design, design-review, design-system
