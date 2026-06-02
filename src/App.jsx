import { useEffect, useMemo, useState } from "react";

const API_ORIGIN = window.location.origin;

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

function formatTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function StatusPill({ label, ok, detail }) {
  return (
    <div className={`status-pill ${ok ? "ok" : "fail"}`}>
      <span className="status-dot" />
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function App() {
  const [cards, setCards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [keyword, setKeyword] = useState("aws");
  const [now, setNow] = useState(new Date());
  const [cardsMeta, setCardsMeta] = useState(null);
  const [postsMeta, setPostsMeta] = useState(null);
  const [health, setHealth] = useState({
    cards: false,
    posts: false
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const visiblePostsCount = useMemo(() => posts.length, [posts]);

  async function fetchJson(path) {
    const response = await fetch(apiUrl(path), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`${path} 호출 실패: HTTP ${response.status}`);
    }

    return response.json();
  }

  async function loadCards() {
    const data = await fetchJson("/api/cards");
    setCards(data.cards || []);
  }

  async function loadPosts(q = "") {
    const trimmedKeyword = q.trim();

    const target = trimmedKeyword
      ? `/api/search?q=${encodeURIComponent(trimmedKeyword)}`
      : "/api/posts";

    const data = await fetchJson(target);
    setPosts(data.posts || []);
  }

  async function loadMeta() {
    const [cardMetaResult, postMetaResult] = await Promise.allSettled([
      fetchJson("/api/cards/meta"),
      fetchJson("/api/posts/meta")
    ]);

    if (cardMetaResult.status === "fulfilled") {
      setCardsMeta(cardMetaResult.value);
    }

    if (postMetaResult.status === "fulfilled") {
      setPostsMeta(postMetaResult.value);
    }
  }

  async function loadHealth() {
    const [cardHealthResult, postHealthResult] = await Promise.allSettled([
      fetchJson("/api/health/cards"),
      fetchJson("/api/health/posts")
    ]);

    setHealth({
      cards:
        cardHealthResult.status === "fulfilled" &&
        cardHealthResult.value.ok === true,
      posts:
        postHealthResult.status === "fulfilled" &&
        postHealthResult.value.ok === true
    });
  }

  async function initialize() {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([
        loadCards(),
        loadPosts(keyword),
        loadMeta(),
        loadHealth()
      ]);
    } catch (error) {
      setErrorMessage(error.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    try {
      setErrorMessage("");
      await loadPosts(keyword);
    } catch (error) {
      setErrorMessage(error.message || "검색 중 오류가 발생했습니다.");
    }
  }

  async function resetSearch() {
    try {
      setKeyword("");
      setErrorMessage("");
      await loadPosts("");
    } catch (error) {
      setErrorMessage(error.message || "목록 초기화 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    initialize();

    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    const healthTimer = setInterval(() => {
      loadHealth();
    }, 5000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(healthTimer);
    };
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />

        <header className="topbar">
          <div className="brand">
            <div className="cloud-icon">☁️</div>
            <div>
              <h1>EKS DEMO Blog - V1</h1>
              <p>
                Frontend 1개 + Backend 2개 + EKS Ingress + ALB Path Routing
              </p>
            </div>
          </div>

          <div className="clock-card">
            <span>🕘</span>
            <strong>{formatTime(now)}</strong>
          </div>
        </header>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-icon">⚛️</span>
            <div>
              <strong>Frontend</strong>
              <p>React + Vite + Nginx</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">🟦</span>
            <div>
              <strong>Backend 1</strong>
              <p>Cards API / Node.js 24</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">🟩</span>
            <div>
              <strong>Backend 2</strong>
              <p>Blog API / Search API</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">🌐</span>
            <div>
              <strong>Ingress</strong>
              <p>ALB Path Routing</p>
            </div>
          </div>
        </section>
      </section>

      <section className="status-zone">
        <StatusPill
          label="Cards API"
          ok={health.cards}
          detail={cardsMeta?.basedOn || "checking..."}
        />

        <StatusPill
          label="Blog API"
          ok={health.posts}
          detail={postsMeta?.basedOn || "checking..."}
        />
      </section>

      {errorMessage && (
        <section className="error-box">
          <strong>⚠️ 오류</strong>
          <span>{errorMessage}</span>
        </section>
      )}

      <section className="panel service-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Cloud Service Cards</p>
            <h2>클라우드 서비스 카드</h2>
          </div>

          <div className="api-badge">
            <span className="check">✓</span>
            <strong>
              {cardsMeta?.basedOn || "Based on Node.js 24 Cards API"}
            </strong>
          </div>
        </div>

        {loading ? (
          <div className="loading">데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="card-grid">
            {cards.map((card) => (
              <article
                className="service-card"
                key={card.id}
                style={{ "--accent": card.accent }}
              >
                <div className="logo-box">
                  <span className="logo-icon">{card.icon}</span>
                  <strong>{card.logoText}</strong>
                </div>

                <div className="service-body">
                  <span className="service-label">{card.label}</span>
                  <h3>{card.shortTitle}</h3>
                  <p>{card.description}</p>
                  <button type="button">SEE MORE</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel blog-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Blog Search</p>
            <h2>블로그 검색 및 목록</h2>
          </div>

          <div className="api-badge green">
            <span className="check">✓</span>
            <strong>
              {postsMeta?.basedOn || "Based on Node.js 24 Blog API"}
            </strong>
          </div>
        </div>

        <form className="search-box" onSubmit={handleSearch}>
          <label>
            <span>Enter your keyword to search</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: aws, eks, docker, node"
            />
          </label>

          <button type="submit">CLICK</button>

          <button type="button" className="ghost-button" onClick={resetSearch}>
            RESET
          </button>
        </form>

        <div className="result-info">
          <span>🔎 검색 결과</span>
          <strong>{visiblePostsCount}</strong>
          <span>개</span>
        </div>

        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <a href={`#post-${post.id}`}>
                <span className="post-title">{post.title}</span>
                <span className="post-meta">
                  {post.category} · {post.level}
                </span>
              </a>
              <p>{post.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
