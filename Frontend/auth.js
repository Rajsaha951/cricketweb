document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'http://localhost:3001/api';
  
  // Create status message element if it doesn't exist
  let statusMessage = document.getElementById('statusMessage');
  if (!statusMessage) {
    statusMessage = document.createElement('div');
    statusMessage.id = 'statusMessage';
    statusMessage.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
      max-width: 80%;
      text-align: center;
    `;
    document.body.appendChild(statusMessage);
  }

  // Function to show status messages
  function showMessage(message, isSuccess) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = isSuccess ? '#4CAF50' : '#F44336';
    statusMessage.style.color = 'white';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }

  // Tab switching (unchanged)
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (loginTab && signupTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
    });
    
    signupTab.addEventListener('click', () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
    });
  }
  
  // Updated login form with better messages
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        
        // Store token and redirect
        localStorage.setItem('authToken', data.token);
        showMessage('Login successful! Redirecting...', true);
        
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
        
      } catch (error) {
        showMessage(error.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Updated signup form with better messages
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('signupConfirmPassword').value;
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      if (password !== confirmPassword) {
        showMessage('Passwords do not match', false);
        return;
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed');
        
        showMessage('Account created successfully! Redirecting...', true);
        
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
        
      } catch (error) {
        showMessage(error.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Updated forgot password form
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value;
      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        
        showMessage('If an account exists with this email, a reset link has been sent', true);
        
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 3000);
        
      } catch (error) {
        showMessage(error.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Updated reset password form
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('resetToken').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', false);
        return;
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Password reset failed');
        
        showMessage('Password updated successfully! Redirecting to login...', true);
        
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
        
      } catch (error) {
        showMessage(error.message, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
});