## Supabase 인증 설정 (베타 MVP 권장)

### 1) 이메일 인증(Confirm email) 끄기

- **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
- **Confirm email** 옵션을 **OFF**로 변경합니다.

이렇게 하면 **신규 가입자는 이메일 인증 없이 즉시 로그인**할 수 있습니다.

### 2) 주의 사항 (테스트 계정)

- 이미 생성된 테스트 계정이 **“미인증” 상태**로 남아 있다면, **Confirm email을 OFF로 바꿔도** 로그인 제한이 계속될 수 있습니다.
- 이 경우 아래 경로에서 해당 유저를 삭제 후 재가입을 권장합니다.
  - **Supabase Dashboard** → **Authentication** → **Users** → 해당 유저 삭제 → 다시 가입

※ 서비스 운영 단계로 전환 시에는 보안 정책(이메일 인증/비밀번호 정책 등)을 다시 논의할 수 있습니다. 지금은 베타 MVP라서 OFF를 권장합니다.


