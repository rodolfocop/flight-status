'use client';
import { useActionState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import { signIn } from './actions';
import LayoutSwitch, { useLayout } from '@/components/layout-switch';
export default function LoginForm({ configured }: { configured: boolean }) {
  const [error, action, pending] = useActionState(signIn, null);
  const layout = useLayout();
  return <main className={`login-view scenery${layout === 'ferias' ? ' theme-vacation' : ''}`}>
    <div className="login-header"><div className="login-nav brand"><span className="brand-mark"><Image src="/destino-certo-symbol.svg" alt="" width={36} height={36}/></span> Destino Certo</div><LayoutSwitch/></div>
    <div className="login-layout">
      <section className="login-intro"><p className="tagline">UM LUGAR PARA SUAS PRÓXIMAS VIAGENS</p><h1>O caminho começa <span>antes da partida.</span></h1><p>Pesquise passagens, acompanhe preços e encontre onde ficar. Tudo no seu tempo.</p></section>
      <section className="login-card glass" aria-labelledby="login-title"><div className="card-icon"><LockKeyhole size={20} aria-hidden="true"/></div><h2 id="login-title">Bem-vindo de volta</h2><p>Acesse sua conta para continuar planejando.</p>
        {!configured && <div className="notice" role="status">A autenticação ainda precisa ser configurada. Consulte a documentação local do projeto.</div>}
        <form action={action} className="login-form"><label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required disabled={!configured}/></label><label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required disabled={!configured}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={pending || !configured}>{pending ? 'Entrando...' : 'Entrar na minha conta'}<ArrowRight size={18} aria-hidden="true"/></button></form>
        <div className="privacy-note"><LockKeyhole size={14} aria-hidden="true"/> Seu espaço de viagem é privado.</div>
      </section>
    </div><p className="login-foot">Encontre seu próximo destino.</p>
  </main>;
}
