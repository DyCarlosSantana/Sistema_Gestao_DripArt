import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TestimonialCard = ({ 
  quote, 
  author, 
  role, 
  variant = 'white', 
  className = '',
  hasStars = false,
  delay = 0 
}: { 
  quote: string, 
  author: string, 
  role: string, 
  variant?: 'white' | 'black' | 'blue',
  className?: string,
  hasStars?: boolean,
  delay?: number
}) => {
  const styles = {
    white: 'bg-white text-[#0f172a] border border-black/5 shadow-sm',
    black: 'bg-[#0f172a] text-white border-none shadow-2xl shadow-black/20',
    blue: 'bg-[#2c99e4] text-white border-none shadow-2xl shadow-blue-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`${styles[variant]} ${className} p-10 rounded-[1.5rem] flex flex-col relative group overflow-hidden h-full`}
    >
      {/* Stars for Highlight Cards */}
      {hasStars && (
        <div className="flex space-x-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className={`fill-current ${i === 4 ? 'opacity-30' : ''}`} />
          ))}
        </div>
      )}

      {/* Quote Icon - Top Right for Highlight, Bottom Right for White */}
      <div className={`absolute ${variant === 'white' ? 'bottom-8 right-8' : 'top-8 right-8'} opacity-[0.03] group-hover:opacity-10 transition-opacity`}>
        <Quote size={80} strokeWidth={3} />
      </div>

      <div className="flex-1">
        <p className={`text-lg leading-relaxed font-medium mb-10 ${variant === 'white' ? 'text-[#0f172a]/80' : 'text-white'}`}>
          "{quote}"
        </p>
      </div>

      <div className="flex items-center space-x-4 mt-auto">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-current/10">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${author}`} 
            alt={author} 
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight">{author}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{role}</span>
        </div>
      </div>
    </motion.div>
  );
};

const TestimonialsBento = () => {
  return (
    <section className="py-32 px-6 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20 text-center">
          <p className="text-dycore-pink font-black uppercase tracking-[0.4em] text-[10px] mb-6">O que nossos clientes dizem</p>
          <h2 className="text-5xl md:text-7xl font-display font-black text-[#0f172a] tracking-tighter leading-[0.85]">
            Quem usa, <br /> recomenda.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1 */}
          <div className="space-y-6 flex flex-col">
            <TestimonialCard 
              variant="black"
              hasStars={true}
              className="flex-[2]"
              quote="O Dycore transformou a forma como nossa equipe gerencia os clientes e locações. Em apenas três meses de uso, tivemos um aumento de 35% nas vendas, com fluxos de trabalho mais inteligentes e controle total do financeiro."
              author="Carlos Silva"
              role="Proprietário — Decorações CS"
              delay={0.1}
            />
            <TestimonialCard 
              className="flex-1"
              quote="Em menos de 60 segundos, todo o nosso sistema de gestão estava configurado e pronto para usar."
              author="Fernanda Lima"
              role="Administradora — FL Locações"
              delay={0.4}
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-6 flex flex-col">
            <TestimonialCard 
              className="flex-1"
              quote="Nossa equipe finalmente parou de usar planilhas e adotou um fluxo de trabalho muito mais limpo e eficiente."
              author="Daniel Souza"
              role="Coordenador — Souza Eventos"
              delay={0.2}
            />
            <TestimonialCard 
              className="flex-1"
              quote="Em apenas um dia, toda a equipe já estava colaborando e gerenciando projetos em um único painel."
              author="Lucas Oliveira"
              role="Gerente — Festa & Cia"
              delay={0.5}
            />
            <TestimonialCard 
              className="flex-1"
              quote="Nosso tempo de resposta ao cliente melhorou em 40%, proporcionando um atendimento mais rápido e eficiente."
              author="Roberto Santos"
              role="Gerente Operacional — RS Decor"
              delay={0.7}
            />
          </div>

          {/* Column 3 */}
          <div className="space-y-6 flex flex-col">
            <TestimonialCard 
              className="flex-1"
              quote="Deixamos para trás processos manuais confusos e abraçamos um fluxo mais organizado que mantém toda a equipe alinhada."
              author="Mariana Costa"
              role="Líder de Operações — MC Buffet"
              delay={0.3}
            />
            <TestimonialCard 
              variant="blue"
              hasStars={true}
              className="flex-[2]"
              quote="O Dycore é uma plataforma de gestão moderna, simples, inteligente e agradável de usar. Ela otimiza tarefas diárias, organiza o relacionamento com clientes e ajuda equipes a trabalhar com mais eficiência, tornando toda a experiência mais fluida."
              author="Patrícia Mendes"
              role="Analista de Processos — PM Locações"
              delay={0.6}
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default TestimonialsBento;
