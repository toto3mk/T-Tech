 document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('login-form');
            const messageBox = document.getElementById('message-box');
            const messageText = document.getElementById('message-text');
            const messageIcon = document.getElementById('message-icon');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const togglePasswordBtn = document.getElementById('toggle-password');
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            const submitButton = document.getElementById('submit-button');
            const buttonText = document.getElementById('button-text');
            const buttonSpinner = document.getElementById('button-spinner');
            const rememberMeCheckbox = document.getElementById('remember-me');

            const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api';
            const LOGIN_API_ENDPOINT = `${API_BASE}/login`;

            togglePasswordBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                eyeIcon.classList.toggle('hidden');
                eyeOffIcon.classList.toggle('hidden');
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                const rememberMe = rememberMeCheckbox.checked;

                if (!username || !password) {
                    showMessage('Please enter both username and password.', true);
                    return;
                }

                showMessage('Authenticating...', false);
                setLoading(true);

                try {
                    const response = await fetch(LOGIN_API_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (rememberMe) {
                            localStorage.setItem('adminAuthToken', data.token);
                            localStorage.setItem('adminUsername', data.username);
                        } else {
                            sessionStorage.setItem('adminAuthToken', data.token);
                            sessionStorage.setItem('adminUsername', data.username);
                        }
                        showMessage('Access granted. Redirecting...', false, true);
                        setTimeout(() => window.location.href = './admin.html', 500);
                    } else {
                        const errorData = await response.json().catch(() => ({ message: 'Invalid credentials.' }));
                        showMessage(errorData.message || 'Invalid credentials.', true);
                        setLoading(false);
                    }
                } catch (error) {
                    showMessage('Connection error. Please try again.', true);
                    setLoading(false);
                }
            });

            function showMessage(message, isError = false, isSuccess = false) {
                messageBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'border-red-500/20', 'bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20', 'bg-blue-500/10', 'text-blue-400', 'border-blue-500/20', 'shake');
                messageIcon.innerHTML = '';

                if (isError) {
                    messageBox.classList.add('bg-red-500/10', 'text-red-400', 'border-red-500/20', 'shake');
                    messageIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                } else if (isSuccess) {
                    messageBox.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
                    messageIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                } else {
                    messageBox.classList.add('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
                    messageIcon.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
                }

                messageText.textContent = message;
            }

            function setLoading(isLoading) {
                submitButton.disabled = isLoading;
                if (isLoading) {
                    buttonText.classList.add('hidden');
                    buttonSpinner.classList.remove('hidden');
                } else {
                    buttonText.classList.remove('hidden');
                    buttonSpinner.classList.add('hidden');
                }
            }

            // Quick check
           /* 
            const existingToken = localStorage.getItem('adminAuthToken') || sessionStorage.getItem('adminAuthToken');
            if (existingToken) {
                fetch(`${API_BASE}/projects`, {
                    headers: { 'Authorization': `Bearer ${existingToken}` }
                }).then(res => {
                    if(res.ok) window.location.href = './admin.html';
                }).catch(()=>{});
            }
        }); */ })