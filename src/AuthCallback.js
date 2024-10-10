import React, { useEffect } from 'react';

const AuthCallback = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Send authorization code to server
    fetch('http://localhost:3001/api/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert('Authentication failed');
        } else {
          alert('Authentication successful');
        }
      });
  }, []);

  return <div>Authenticating...</div>;
};

export default AuthCallback;
