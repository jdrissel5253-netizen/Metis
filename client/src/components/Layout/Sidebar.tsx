import React from 'react';
import styled from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/goals', label: 'Goals', icon: '◎' },
  { to: '/money', label: 'Money', icon: '◉' },
  { to: '/tasks', label: 'Tasks', icon: '◧' },
  { to: '/talos', label: 'Talos', icon: '◬' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Nav>
      <Top>
        <Logo>Metis</Logo>
        <NavList>
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavItem to={to} end={to === '/'}>
                <Icon>{icon}</Icon>
                <span>{label}</span>
              </NavItem>
            </li>
          ))}
        </NavList>
      </Top>
      <Bottom>
        <UserRow>
          <Avatar>{user?.name?.[0]?.toUpperCase()}</Avatar>
          <UserName>{user?.name}</UserName>
        </UserRow>
        <LogoutBtn onClick={handleLogout}>Sign out</LogoutBtn>
      </Bottom>
    </Nav>
  );
}

const Nav = styled.nav`
  width: 220px;
  min-height: 100vh;
  background: #261A0C;
  border-right: 1px solid #3E2A14;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 28px 16px;
  position: fixed;
  top: 0;
  left: 0;

  @media (max-width: 768px) {
    width: 100%;
    min-height: auto;
    flex-direction: row;
    align-items: center;
    position: sticky;
    padding: 12px 16px;
    border-right: none;
    border-bottom: 1px solid #3E2A14;
  }
`;

const Top = styled.div`
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
`;

const Logo = styled.div`
  font-family: 'DM Serif Display', serif;
  font-size: 1.5rem;
  color: #FBBF24;
  margin-bottom: 32px;
  padding-left: 8px;

  @media (max-width: 768px) {
    margin-bottom: 0;
    margin-right: 16px;
  }
`;

const NavList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 768px) {
    flex-direction: row;
    gap: 4px;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #8C7050;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;

  &:hover { background: #1C1208; color: #F5ECD8; }
  &.active { background: rgba(251,191,36,0.12); color: #FBBF24; }

  @media (max-width: 768px) {
    padding: 8px 10px;
    span { display: none; }
  }
`;

const Icon = styled.span`
  font-size: 1rem;
  line-height: 1;
`;

const Bottom = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;

  @media (max-width: 768px) { display: none; }
`;

const Avatar = styled.div`
  width: 30px;
  height: 30px;
  background: rgba(251,191,36,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #FBBF24;
`;

const UserName = styled.span`
  font-size: 0.85rem;
  color: #8C7050;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LogoutBtn = styled.button`
  background: none;
  border: 1px solid #3E2A14;
  border-radius: 8px;
  color: #8C7050;
  padding: 8px 12px;
  font-size: 0.8rem;
  width: 100%;
  transition: all 0.15s;

  &:hover { border-color: #F07050; color: #F07050; }

  @media (max-width: 768px) {
    width: auto;
    padding: 6px 10px;
  }
`;
