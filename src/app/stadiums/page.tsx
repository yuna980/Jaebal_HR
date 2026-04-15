'use client';

import { STADIUMS } from '@/data/stadiums';
import { motion } from 'framer-motion';
import { MapPin, Bus, Utensils, Search } from 'lucide-react';
import { useState } from 'react';

export default function StadiumsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStadiums = STADIUMS.filter(s => 
    s.name.includes(searchTerm) || s.location.includes(searchTerm)
  );

  return (
    <div className="container">
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>구장별 맛도리 리스트 🍕</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>구장 주변 맛집과 교통 정보를 확인하세요!</p>
      </header>

      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="구장 이름을 검색하세요" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingLeft: '44px',
            borderRadius: 'var(--radius-full)',
            border: '2px solid var(--border)',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <Search size={20} color="var(--text-light)" style={{ position: 'absolute', left: '16px', top: '12px' }} />
      </div>

      {filteredStadiums.map((stadium, idx) => (
        <motion.div 
          key={stadium.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="card"
          style={{ marginBottom: '20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <MapPin size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '18px' }}>{stadium.name}</h3>
          </div>

          <div style={{ background: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Bus size={16} color="var(--text-light)" />
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>대중교통</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginLeft: '24px' }}>
              {stadium.transport.metro} {stadium.transport.bus}
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Utensils size={16} color="var(--text-light)" />
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>맛도리 추천</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stadium.restaurants.map((rest, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: i === stadium.restaurants.length - 1 ? 'none' : '1px dashed var(--border)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                    {rest.name} <span style={{ color: 'var(--primary)', fontSize: '10px', background: 'var(--border)', padding: '2px 6px', borderRadius: '10px' }}>{rest.menu}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{rest.description}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
