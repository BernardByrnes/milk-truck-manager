'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (isRegister) {
        setIsRegister(false);
        setError('');
        setPassword('');
        alert('Registration successful! Please log in.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-accent mb-2">Milk Truck Manager</h1>
          <p className="text-text-secondary text-sm">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="phone"
            type="tel"
            label="Phone Number"
            placeholder="0771234567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm text-accent hover:underline"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </Card>
    </div>
  );
}