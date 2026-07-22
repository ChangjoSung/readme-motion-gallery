# README Motion Gallery

[English](README.md) | [한국어](README.ko.md)

GitHub 프로필과 저장소 README를 위한 작고 결정적인 애니메이션 GIF 갤러리를 생성합니다.

README Motion Gallery는 로컬 PNG 또는 JPEG 스크린샷을 하나의 최적화된 GIF로 변환합니다.

> [!NOTE]
> 이 번역본과 영문 문서의 내용이 다를 경우 [영문 README](README.md)를 최신 기준으로 봅니다.

## 데모

![네 개의 스크린샷이 staggered 레이아웃에서 순차적으로 나타나는 모습](./docs/assets/readme-gallery-demo.gif)

> [!IMPORTANT]
> GitHub README 이미지는 실제 포인터 위치에 반응하는 hover gallery를 제공할 수 없습니다.

## 빠른 시작

Python 3.10 이상이 필요합니다.

```bash
python -m pip install -e .
python examples/basic/create_demo_images.py
rmg build --config examples/basic/gallery.yml --output docs/assets/readme-gallery-demo.gif
```

생성된 파일을 README에 삽입합니다.

```md
![Project screenshots](./docs/assets/readme-gallery-demo.gif)
```

## 설정

경로는 YAML 파일을 기준으로 해석됩니다.

```yaml
version: 1

canvas:
  width: 1280
  height: 720
  background: "#07080c"

images:
  - path: screenshots/1.png
  - path: screenshots/2.png
  - path: screenshots/3.png
  - path: screenshots/4.png

layout:
  type: staggered          # grid | staggered
  margin: 32
  gap: 24
  card_aspect_ratio: 1.777778
  preserve_aspect_ratio: true
  border_radius: 10
  border_width: 2
  border_color: "#745f4c"
  shadow: true

animation:
  transition: wipe
  reveal_mode: cumulative # cumulative | replace
  transition_ms: 420
  hold_ms: 800
  initial_hold_ms: 450
  final_hold_ms: 2300
  frames_per_transition: 7
  scan_line: true
  loop: true

output:
  path: assets/readme-gallery.gif
  max_size_mb: 5
  colors: 224
```

첫 번째 팔레트 결과가 `max_size_mb`를 초과하면 렌더러가 색상 수를 줄여 다시 시도합니다. 32색 결과도
제한을 초과하면 빌드가 실패하고 캔버스 크기, 이미지 수 또는 전환 프레임 수를 줄이라는 안내를 표시합니다.

## CLI

```text
rmg build --config gallery.yml
rmg build --config gallery.yml --output assets/custom.gif
rmg --version
```

## GitHub Action

Action은 파일을 생성하지만 자동으로 커밋하지 않습니다. 사용하는 저장소에서 쓰기 권한과 커밋 정책을 직접
제어합니다.

```yaml
name: Generate README gallery

on:
  workflow_dispatch:
  push:
    paths:
      - "gallery.yml"
      - "screenshots/**"

permissions:
  contents: write

jobs:
  gallery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: ChangjoSung/readme-motion-gallery@v0.1.0
        with:
          config: gallery.yml
          output: assets/readme-gallery.gif
      - name: Commit generated gallery
        shell: bash
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/readme-gallery.gif
          git diff --cached --quiet && exit 0
          git commit -m "docs: update README gallery"
          git push
```

보안이 중요한 저장소에서는 이동 태그 대신 전체 릴리스 SHA를 고정하여 사용합니다.

## 설계 보장 사항

- 입력은 로컬에 유지되며 버전 0.1은 원격 URL을 가져오지 않습니다.
- 원본 이미지는 수정하지 않습니다.
- `preserve_aspect_ratio: true`는 contain 동작을 사용하며 스크린샷을 자르지 않습니다.
- 하나의 공유 GIF 팔레트를 사용하여 공개된 카드의 색상이 프레임마다 바뀌지 않게 합니다.
- 용량 제한을 충족한 뒤 결과 파일을 원자적으로 저장합니다.
- 알 수 없는 설정 키를 무시하지 않고 즉시 실패합니다.

## 로드맵

- 더 많은 전환 및 레이아웃
- 브라우저 기반 설정 프리뷰 ([MVP 계약](docs/web-editor-contract-v1.md))
- 선택적 GitHub 호스팅 설정 탐색
- 수요와 악용 방지 대책을 검증한 후 호스팅 렌더링 API 제공

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 확인해 주세요. 보안 신고는 [SECURITY.md](SECURITY.md)를 따릅니다.
Issue와 PR은 한국어 또는 영어로 작성할 수 있습니다.

## 라이선스

MIT
