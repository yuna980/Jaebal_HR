'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { rememberAuthenticatedUser } from '@/lib/supabase/auth';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
}

const authCopy = {
  login: {
    title: '로그인',
    subtitle: '야구없인못살아를 이용하려면 로그인이 필요해요.',
    button: '로그인하기',
    loading: '로그인 중',
    alternateText: '아직 계정이 없나요?',
    alternateHref: '/signup',
    alternateLabel: '회원가입',
  },
  signup: {
    title: '회원가입',
    subtitle: '계정을 만들고 나만의 야구 기록을 안전하게 저장해요.',
    button: '회원가입하기',
    loading: '가입 중',
    alternateText: '이미 계정이 있나요?',
    alternateHref: '/login',
    alternateLabel: '로그인',
  },
};

function getFriendlyAuthError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 맞지 않아요.';
  }

  if (lowerMessage.includes('password')) {
    return '비밀번호는 6자 이상으로 입력해 주세요.';
  }

  if (lowerMessage.includes('email')) {
    return '이메일 주소를 다시 확인해 주세요.';
  }

  return '잠시 후 다시 시도해 주세요.';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const copy = authCopy[mode];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase 환경변수가 아직 설정되지 않았어요.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage('로그인 연결을 준비하지 못했어요.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(getFriendlyAuthError(error.message));
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          rememberAuthenticatedUser(data.user.id);
        }

        window.location.replace('/dashboard');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(getFriendlyAuthError(error.message));
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setNoticeMessage('인증 메일을 보냈어요. 메일 확인 후 로그인해 주세요.');
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        rememberAuthenticatedUser(data.user.id, { resetPersonalData: true });
      }

      window.location.replace('/teams');
    } catch {
      setErrorMessage('잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby={`${mode}-title`}>
        <div className="auth-brand">
          <div className="auth-logo">야구</div>
          <div>
            <p className="auth-eyebrow">야구없인못살아</p>
            <h1 id={`${mode}-title`}>{copy.title}</h1>
          </div>
        </div>

        <p className="auth-subtitle">{copy.subtitle}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>이메일</span>
            <div className="auth-input-wrap">
              <Mail size={18} color="#8B95A1" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>비밀번호</span>
            <div className="auth-input-wrap">
              <Lock size={18} color="#8B95A1" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6자 이상"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="auth-icon-button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {errorMessage ? <p className="auth-message auth-message-error">{errorMessage}</p> : null}
          {noticeMessage ? <p className="auth-message auth-message-notice">{noticeMessage}</p> : null}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                {copy.loading}
              </>
            ) : (
              copy.button
            )}
          </button>
        </form>

        <p className="auth-alternate">
          {copy.alternateText}{' '}
          <Link href={copy.alternateHref}>{copy.alternateLabel}</Link>
        </p>
      </section>
    </main>
  );
}
