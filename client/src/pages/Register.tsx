import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Glow />
      <Card>
        <Logo>Metis</Logo>
        <Tagline>Create your account</Tagline>
        <Form onSubmit={handleSubmit}>
          <Input
            placeholder="Your name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
          />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <SubmitBtn type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </SubmitBtn>
        </Form>
        <Footer>
          Already have an account? <Link to="/login">Sign in</Link>
        </Footer>
      </Card>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1C1208;
  position: relative;
  overflow: hidden;
`;

const Glow = styled.div`
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%);
  pointer-events: none;
`;

const Card = styled.div`
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
`;

const Logo = styled.h1`
  font-family: 'DM Serif Display', serif;
  font-size: 2.2rem;
  color: #FBBF24;
  text-align: center;
  margin-bottom: 6px;
`;

const Tagline = styled.p`
  text-align: center;
  color: #8C7050;
  font-size: 0.9rem;
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Input = styled.input`
  background: #1C1208;
  border: 1px solid #3E2A14;
  border-radius: 8px;
  padding: 12px 16px;
  color: #F5ECD8;
  outline: none;
  transition: border-color 0.2s;

  &:focus { border-color: #FBBF24; }
  &::placeholder { color: #6B5038; }
`;

const SubmitBtn = styled.button`
  background: #FBBF24;
  color: #1C1208;
  border: none;
  border-radius: 8px;
  padding: 13px;
  font-weight: 600;
  font-size: 0.95rem;
  margin-top: 4px;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  color: #F07050;
  font-size: 0.85rem;
  text-align: center;
`;

const Footer = styled.p`
  text-align: center;
  color: #8C7050;
  font-size: 0.85rem;
  margin-top: 24px;

  a { color: #FBBF24; }
  a:hover { text-decoration: underline; }
`;
