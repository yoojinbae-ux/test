# yeyak

회의실 예약과 프로젝트 트래킹을 관리하는 React/Vite 앱입니다.

## 실행

```bash
npm install
npm run dev
```

## 빌드 확인

```bash
npm run build
```

## 공유 데이터베이스 설정

모든 사용자가 같은 예약 내용을 보려면 Supabase 연결이 필요합니다. 연결하지 않으면 앱은 브라우저별 `localStorage`에 저장되어 기기마다 데이터가 달라집니다.

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. `.env.example`을 복사해 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. 개발 서버나 배포 빌드를 다시 실행합니다.

이 설정이 끝나면 예약, 프로젝트, 프로젝트 일정, 메모, 투두, 참석 확인 변경 내용이 Supabase에 저장되어 같은 웹 링크를 여는 사용자들이 동일한 데이터를 보게 됩니다.
