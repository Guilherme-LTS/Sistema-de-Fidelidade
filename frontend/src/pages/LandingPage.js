import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './LandingPage.module.css';

const CUSTOMER_SESSION_KEY = 'fidelizi.customer.session.v1';

const normalizeDocument = (value) => value.replace(/\D/g, '').slice(0, 11);

const formatDocument = (value) =>
  normalizeDocument(value)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const formatPoints = (value) => Number(value || 0).toLocaleString('pt-BR');

const formatDate = (dateValue) => {
  if (!dateValue) return '--';
  return new Date(dateValue).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return '--';
  return new Date(dateValue).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPartnerInitials = (name) => {
  if (!name) return 'PT';
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
};

const readCustomerSession = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.document) return null;
    return {
      document: normalizeDocument(parsed.document),
      name: (parsed.name || 'Cliente').trim() || 'Cliente',
    };
  } catch {
    return null;
  }
};

function LandingPage() {
  const { tenantSlug } = useParams();
  const apiBase = process.env.REACT_APP_API_URL;
  const publicTenantIdFromEnv = process.env.REACT_APP_PUBLIC_TENANT_ID || '';

  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [authMode, setAuthMode] = useState('login');
  const [documentInput, setDocumentInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState('');
  const [selectedPublicTenantId, setSelectedPublicTenantId] = useState('');

  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPartner, setSelectedPartner] = useState(null);
  const [statement, setStatement] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [tenantResolving, setTenantResolving] = useState(Boolean(tenantSlug));
  const [resolvedTenantId, setResolvedTenantId] = useState('');
  const [tenantResolveError, setTenantResolveError] = useState('');
  const requiresPartnerSelection = !tenantSlug && !publicTenantIdFromEnv;
  const activePublicTenantId = resolvedTenantId || selectedPublicTenantId || publicTenantIdFromEnv;
  const selectedPublicPartner = partners.find((partner) => partner.tenant_id === selectedPublicTenantId) || null;

  const filteredBalances = useMemo(() => {
    if (!searchTerm.trim()) return balances;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return balances.filter((item) =>
      String(item.tenant_name || '')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [balances, searchTerm]);

  const loadBalances = useCallback(async (session, preferredTenantId = '') => {
    if (!session?.document) return;

    try {
      setLoadingBalances(true);
      setBalancesError('');
      const queryParams = new URLSearchParams();
      const publicTenantId = preferredTenantId || selectedPublicTenantId || publicTenantIdFromEnv;

      if (publicTenantId) {
        queryParams.set('tenant_id', publicTenantId);
      } else if (tenantSlug) {
        queryParams.set('tenant_slug', tenantSlug);
      } else {
        setBalances([]);
        setSelectedPartner(null);
        setStatement([]);
        setRewards([]);
        setBalancesError('Escolha o restaurante para consultar seus pontos.');
        return;
      }

      const response = await fetch(`${apiBase}/public/pontos/${session.document}?${queryParams.toString()}`);

      if (response.status === 404) {
        setBalances([]);
        setSelectedPartner(null);
        setStatement([]);
        setRewards([]);
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar seus pontos.');

      const nextBalances = Array.isArray(data.saldos)
        ? data.saldos
        : Array.isArray(data.balances)
          ? data.balances
          : [];
      setBalances(nextBalances);

      if (nextBalances.length === 1 && !preferredTenantId) {
        setSelectedPartner(nextBalances[0]);
      } else if (preferredTenantId && nextBalances.length > 0) {
        const preferred = nextBalances.find((item) => item.tenant_id === preferredTenantId);
        if (preferred) {
          setSelectedPartner(preferred);
        }
      }
    } catch (error) {
      setBalancesError(error.message || 'Erro ao carregar seus pontos.');
    } finally {
      setLoadingBalances(false);
    }
  }, [apiBase, tenantSlug, selectedPublicTenantId, publicTenantIdFromEnv]);

  useEffect(() => {
    if (!customerSession) return;
    loadBalances(customerSession, activePublicTenantId);
  }, [customerSession, activePublicTenantId, loadBalances]);

  useEffect(() => {
    if (!requiresPartnerSelection) {
      setPartners([]);
      setPartnersError('');
      setPartnersLoading(false);
      return;
    }

    const loadPartners = async () => {
      try {
        setPartnersLoading(true);
        setPartnersError('');
        const response = await fetch(`${apiBase}/public/partners`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar restaurantes.');
        }
        setPartners(Array.isArray(data.partners) ? data.partners : []);
      } catch (error) {
        setPartnersError(error.message || 'Erro ao carregar restaurantes.');
      } finally {
        setPartnersLoading(false);
      }
    };

    loadPartners();
  }, [apiBase, requiresPartnerSelection]);

  useEffect(() => {
    if (requiresPartnerSelection && !selectedPublicTenantId && partners.length === 1) {
      setSelectedPublicTenantId(partners[0].tenant_id);
    }
  }, [partners, requiresPartnerSelection, selectedPublicTenantId]);

  useEffect(() => {
    if (!tenantSlug) {
      setTenantResolving(false);
      setResolvedTenantId('');
      setTenantResolveError('');
      return;
    }

    const resolveTenant = async () => {
      try {
        setTenantResolving(true);
        setResolvedTenantId('');
        setTenantResolveError('');
        const response = await fetch(`${apiBase}/public/tenants/${encodeURIComponent(tenantSlug)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível resolver o tenant.');
        setResolvedTenantId(data.tenant_id || '');
      } catch (error) {
        setTenantResolveError('Não foi possível identificar o estabelecimento desta URL.');
      } finally {
        setTenantResolving(false);
      }
    };

    resolveTenant();
  }, [tenantSlug, apiBase]);

  const handleAuthenticate = async (event) => {
    event.preventDefault();

    const normalizedDocument = normalizeDocument(documentInput);
    if (normalizedDocument.length !== 11) {
      toast.warning('Informe um CPF válido para acessar seus pontos.');
      return;
    }

    if (authMode === 'cadastro' && nameInput.trim().length < 2) {
      toast.warning('Informe seu nome para concluir o cadastro.');
      return;
    }

    if (requiresPartnerSelection && !selectedPublicTenantId) {
      toast.warning('Escolha o restaurante para consultar seus pontos.');
      return;
    }

    setAuthLoading(true);
    const session = {
      document: normalizedDocument,
      name: (nameInput.trim() || customerSession?.name || 'Cliente'),
    };

    try {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
      setCustomerSession(session);
      setSelectedPartner(null);
      setStatement([]);
      setRewards([]);
      setSearchTerm('');
      void loadBalances(session, activePublicTenantId);
      if (authMode === 'cadastro') {
        toast.success('Cadastro concluído. Bem-vindo ao Fidelizi!');
      }
    } catch {
      toast.error('Não foi possível salvar sua sessão local.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    setCustomerSession(null);
    setDocumentInput('');
    setNameInput('');
    setBalances([]);
    setSelectedPartner(null);
    setStatement([]);
    setRewards([]);
    setBalancesError('');
    setDetailError('');
  };

  const handlePartnerSelection = (tenantId) => {
    setSelectedPublicTenantId(tenantId);
    setSelectedPartner(null);
    setBalances([]);
    setStatement([]);
    setRewards([]);
    setBalancesError('');
    setDetailError('');
    setSearchTerm('');
  };

  const handleOpenPartner = useCallback(
    async (partner) => {
      if (!partner?.tenant_id || !customerSession?.document) return;

      setSelectedPartner(partner);
      setLoadingDetail(true);
      setDetailError('');
      setStatement([]);
      setRewards([]);

      try {
        const [statementRes, rewardsRes] = await Promise.all([
          fetch(`${apiBase}/public/extrato/${customerSession.document}?tenant_id=${encodeURIComponent(partner.tenant_id)}`),
          fetch(`${apiBase}/public/rewards?tenant_id=${encodeURIComponent(partner.tenant_id)}`),
        ]);

        const statementData = await statementRes.json();
        const rewardsData = await rewardsRes.json();

        if (!statementRes.ok && statementRes.status !== 404) {
          throw new Error(statementData.error || 'Erro ao carregar extrato.');
        }
        if (!rewardsRes.ok) {
          throw new Error(rewardsData.error || 'Erro ao carregar recompensas.');
        }

        setStatement(Array.isArray(statementData.statement) ? statementData.statement : []);
        setRewards(Array.isArray(rewardsData.rewards) ? rewardsData.rewards : []);
      } catch (error) {
        setDetailError(error.message || 'Erro ao carregar detalhes do restaurante.');
      } finally {
        setLoadingDetail(false);
      }
    },
    [apiBase, customerSession]
  );

  useEffect(() => {
    if (!selectedPartner) return;
    handleOpenPartner(selectedPartner);
  }, [selectedPartner, handleOpenPartner]);

  const handleBackToList = () => {
    setSelectedPartner(null);
    setStatement([]);
    setRewards([]);
    setDetailError('');
  };

  const isAuthenticated = Boolean(customerSession?.document);

  const selectedAvailablePoints = Number(selectedPartner?.pontos_disponiveis || 0);

  const nextExpiringPoints = Number(selectedPartner?.pontos_expirando || 0);

  const partnerSubtitle =
    nextExpiringPoints > 0
      ? `${formatPoints(nextExpiringPoints)} pontos vencem em ${formatDate(selectedPartner?.data_proxima_expiracao)}`
      : 'Sem pontos próximos do vencimento';

  return (
    <div className={styles.pageContainer}>
      <header className={styles.topBar}>
        <div className={styles.brandBlock}>
          <img src="/logo192.png" alt="Logo Fidelidade" className={styles.brandLogo} />
          <span className={styles.brandName}>Fidelidade</span>
          <span className={styles.brandAccent}>Pro</span>
        </div>
        <div className={styles.topActions}>
          {isAuthenticated && (
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Sair
            </button>
          )}
          <Link to="/login" className={styles.operatorLink}>
            Área do operador
          </Link>
        </div>
      </header>

      <main className={styles.mainContent}>
        {!isAuthenticated ? (
          <section className={styles.authPanel}>
            <div className={styles.authBox}>
              <h1>Entre para ver seus pontos</h1>
              <p>
                Consulte seu saldo em todos os restaurantes parceiros e acompanhe ganhos e resgates em um só lugar.
              </p>

              <div className={styles.authTabs}>
                <button
                  type="button"
                  className={`${styles.authTab} ${authMode === 'login' ? styles.authTabActive : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`${styles.authTab} ${authMode === 'cadastro' ? styles.authTabActive : ''}`}
                  onClick={() => setAuthMode('cadastro')}
                >
                  Cadastro
                </button>
              </div>

              <form className={styles.authForm} onSubmit={handleAuthenticate}>
                {authMode === 'cadastro' && (
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Seu nome"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                  />
                )}
                {requiresPartnerSelection && (
                  <select
                    className={styles.input}
                    value={selectedPublicTenantId}
                    onChange={(event) => handlePartnerSelection(event.target.value)}
                    disabled={partnersLoading}
                    required
                  >
                    <option value="">
                      {partnersLoading ? 'Carregando restaurantes...' : 'Escolha o restaurante'}
                    </option>
                    {partners.map((partner) => (
                      <option key={partner.tenant_id} value={partner.tenant_id}>
                        {partner.tenant_name}
                      </option>
                    ))}
                  </select>
                )}
                {partnersError && <p className={styles.errorText}>{partnersError}</p>}
                <input
                  type="text"
                  className={styles.input}
                  placeholder="CPF"
                  maxLength={14}
                  value={documentInput}
                  onChange={(event) => setDocumentInput(formatDocument(event.target.value))}
                />
                <button type="submit" className={styles.primaryButton} disabled={authLoading}>
                  {authLoading ? 'Acessando...' : authMode === 'cadastro' ? 'Criar conta' : 'Entrar'}
                </button>
              </form>

              <small className={styles.helperText}>
                Ao continuar, você confirma que deseja acessar seu histórico do programa de fidelidade.
              </small>
            </div>
          </section>
        ) : !selectedPartner ? (
          <section className={styles.listScreen}>
            <div className={styles.titleBlock}>
              <h1>
                Olá <span>{customerSession.name.toUpperCase()}</span>! Escolha um estabelecimento para continuar:
              </h1>
              <p>Aqui aparecem apenas os restaurantes onde você já acumulou pontos.</p>
              {tenantResolving && <p className={styles.infoText}>Identificando estabelecimento do link...</p>}
              {tenantResolveError && <p className={styles.errorText}>{tenantResolveError}</p>}
            </div>

            {requiresPartnerSelection && (
              <div className={styles.partnerSelectorBox}>
                <label htmlFor="partner-selector">Restaurante</label>
                <select
                  id="partner-selector"
                  className={styles.input}
                  value={selectedPublicTenantId}
                  onChange={(event) => handlePartnerSelection(event.target.value)}
                  disabled={partnersLoading}
                >
                  <option value="">
                    {partnersLoading ? 'Carregando restaurantes...' : 'Escolha o restaurante'}
                  </option>
                  {partners.map((partner) => (
                    <option key={partner.tenant_id} value={partner.tenant_id}>
                      {partner.tenant_name}
                    </option>
                  ))}
                </select>
                {selectedPublicPartner && (
                  <small>Consultando pontos em {selectedPublicPartner.tenant_name}.</small>
                )}
                {partnersError && <p className={styles.errorText}>{partnersError}</p>}
              </div>
            )}

            <div className={styles.searchWrap}>
              <input
                type="text"
                className={styles.input}
                placeholder="Buscar estabelecimento..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {loadingBalances ? (
              <div className={styles.cardList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`loading-${index}`} className={`${styles.restaurantCard} ${styles.loadingCard}`}>
                    <div className={styles.logoSkeleton} />
                    <div className={styles.contentSkeleton}>
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
              </div>
            ) : balancesError ? (
              <div className={styles.feedbackBox}>
                <p>{balancesError}</p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => loadBalances(customerSession, activePublicTenantId)}
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className={styles.feedbackBox}>
                <h2>Você ainda não possui pontos em nenhum restaurante.</h2>
                <p>Faça uma compra em um parceiro Fidelizi e volte para acompanhar seu saldo.</p>
              </div>
            ) : (
              <div className={styles.cardList}>
                {filteredBalances.map((partner) => (
                  <button
                    type="button"
                    key={partner.tenant_id}
                    className={styles.restaurantCard}
                    onClick={() => setSelectedPartner(partner)}
                  >
                    <div className={styles.partnerLogo}>{getPartnerInitials(partner.tenant_name)}</div>
                    <div className={styles.partnerInfo}>
                      <strong>{partner.tenant_name}</strong>
                      <span>{formatPoints(partner.pontos_disponiveis)} pontos disponíveis</span>
                    </div>
                    <div className={styles.partnerPoints}>{formatPoints(partner.pontos_disponiveis)}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className={styles.detailScreen}>
            <div className={styles.detailHero}>
              <button type="button" className={styles.backButton} onClick={handleBackToList}>
                Voltar para lista
              </button>
              <div className={styles.partnerIdentity}>
                <div className={styles.partnerLogoLarge}>{getPartnerInitials(selectedPartner.tenant_name)}</div>
                <div>
                  <h1>{selectedPartner.tenant_name}</h1>
                  <p>{partnerSubtitle}</p>
                </div>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <article className={styles.metricCard}>
                <h2>Saldo</h2>
                <strong>{formatPoints(selectedAvailablePoints)} pontos</strong>
                <span>+{formatPoints(selectedPartner.pontos_pendentes || 0)} pendentes</span>
              </article>
              <article className={styles.metricCard}>
                <h2>Próximo Vencimento</h2>
                <strong>{formatPoints(nextExpiringPoints)} pontos</strong>
                <span>{formatDate(selectedPartner.data_proxima_expiracao)}</span>
              </article>
            </div>

            {loadingDetail ? (
              <div className={styles.feedbackBox}>
                <p>Carregando extrato e recompensas...</p>
              </div>
            ) : detailError ? (
              <div className={styles.feedbackBox}>
                <p>{detailError}</p>
                <button type="button" className={styles.secondaryButton} onClick={() => handleOpenPartner(selectedPartner)}>
                  Recarregar detalhes
                </button>
              </div>
            ) : (
              <div className={styles.detailLayout}>
                <section className={styles.statementPanel}>
                  <h2>Extrato</h2>
                  {statement.length === 0 ? (
                    <p className={styles.emptyText}>Ainda não há movimentações para este restaurante.</p>
                  ) : (
                    <ul className={styles.statementList}>
                      {statement.map((item, index) => (
                        <li key={`${item.data}-${index}`} className={styles.statementItem}>
                          <div>
                            <strong>{item.descricao}</strong>
                            <small>{formatDateTime(item.data)}</small>
                          </div>
                          <span className={item.tipo === 'credito' ? styles.credit : styles.debit}>
                            {item.tipo === 'credito' ? '+' : '-'}{formatPoints(item.pontos)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <aside className={styles.redeemPanel}>
                  <h2>Opções de Resgate</h2>
                  {rewards.length === 0 ? (
                    <p className={styles.emptyText}>Este restaurante ainda não publicou prêmios.</p>
                  ) : (
                    <ul className={styles.rewardsList}>
                      {rewards.map((reward) => {
                        const cost = Number(reward.points_cost || 0);
                        const canRedeem = selectedAvailablePoints >= cost;

                        return (
                          <li key={reward.id} className={styles.rewardItem}>
                            <div>
                              <strong>{reward.name}</strong>
                              <p>{reward.description || 'Recompensa sem descrição.'}</p>
                              <small>{formatPoints(cost)} pontos</small>
                            </div>
                            <button type="button" className={styles.redeemButton} disabled={!canRedeem}>
                              {canRedeem ? 'Disponível' : 'Pontos insuficientes'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </aside>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className={styles.footer}>fidelizi 2026 • Todos os direitos reservados</footer>
    </div>
  );
}

export default LandingPage;

