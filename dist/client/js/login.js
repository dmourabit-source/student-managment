document.addEventListener('DOMContentLoaded', () => {
    initSparkles();
    
    let isLogin = true;
    const form = document.getElementById('authForm');
    const toggleLogin = document.getElementById('toggleLogin');
    const toggleRegister = document.getElementById('toggleRegister');
    const submitBtnText = document.getElementById('submitBtnText');
    const authError = document.getElementById('authError');
  
    toggleLogin.addEventListener('click', () => {
      isLogin = true;
      toggleLogin.classList.add('active');
      toggleRegister.classList.remove('active');
      submitBtnText.textContent = 'Log In 💖';
      authError.style.display = 'none';
    });
  
    toggleRegister.addEventListener('click', () => {
      isLogin = false;
      toggleRegister.classList.add('active');
      toggleLogin.classList.remove('active');
      submitBtnText.textContent = 'Sign Up ✨';
      authError.style.display = 'none';
    });
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.token) {
          localStorage.setItem('girly_token', data.token);
          window.location.href = '/';
        } else {
          authError.textContent = data.error || 'Authentication failed';
          authError.style.display = 'block';
        }
      } catch (err) {
        authError.textContent = 'Network error. Try again!';
        authError.style.display = 'block';
      }
    });
  });
  
  function initSparkles() {
    const container = document.getElementById('sparkles');
    if (!container) return;
    const colors = ['#ff6b9d','#a855f7','#f472b6','#fbbf24','#c084fc','#fb7185'];
    for (let i = 0; i < 18; i++) {
        const dot = document.createElement('div');
        dot.className = 'sparkle-dot';
        const size = Math.random() * 6 + 3;
        dot.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        position: absolute;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        animation: float-sparkle ${Math.random() * 12 + 8}s infinite linear;
        animation-delay:${Math.random() * 10}s;
        opacity: 0.6;
        `;
        container.appendChild(dot);
    }
  }
