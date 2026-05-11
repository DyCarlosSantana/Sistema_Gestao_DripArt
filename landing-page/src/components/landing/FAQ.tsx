import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-black/5 last:border-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex items-center justify-between text-left group"
      >
        <span className="text-xl font-bold text-[#0f172a] group-hover:text-dycore-pink transition-colors">
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full border border-black/5 flex items-center justify-center transition-all ${isOpen ? 'bg-[#0f172a] text-white rotate-180' : 'bg-transparent text-[#0f172a]'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-lg text-[#0f172a]/50 font-medium leading-relaxed max-w-3xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const faqs = [
    {
      question: "Como funciona o período de teste de 14 dias?",
      answer: "Você pode acessar todas as funcionalidades do sistema sem custos por 14 dias. Não pedimos cartão de crédito para começar. Após o período, você escolhe o plano que melhor se adapta à sua empresa."
    },
    {
      question: "O Dycore oferece suporte técnico?",
      answer: "Sim! Nosso suporte é prioritário para todos os planos. Oferecemos ajuda via chat em tempo real e documentação completa para você tirar o máximo proveito da plataforma."
    },
    {
      question: "Posso cancelar minha assinatura a qualquer momento?",
      answer: "Sim, não temos fidelidade obrigatória. Você pode cancelar ou alterar seu plano a qualquer momento diretamente pelo painel administrativo."
    },
    {
      question: "Meus dados estão seguros no sistema?",
      answer: "A segurança é nossa prioridade. Utilizamos criptografia de ponta a ponta e backups diários para garantir que todas as informações da sua empresa estejam protegidas e acessíveis apenas por você."
    },
    {
      question: "O sistema funciona em qualquer dispositivo?",
      answer: "Sim. O Dycore é 100% responsivo e roda em qualquer navegador — desktop, tablet ou smartphone. Você pode gerenciar sua empresa de onde estiver, sem precisar instalar nenhum aplicativo."
    }
  ];

  return (
    <section id="faq" className="py-32 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-20">
          <p className="text-dycore-pink font-black uppercase tracking-[0.4em] text-[10px] mb-6 text-center">Tire suas Dúvidas</p>
          <h2 className="text-5xl md:text-7xl font-display font-black text-[#0f172a] tracking-tighter leading-[0.85] text-center">
            Perguntas <br /> Frequentes.
          </h2>
        </div>

        <div className="bg-[#fcfcfc] rounded-[3rem] p-10 md:p-16 border border-black/5 shadow-2xl shadow-black/[0.02]">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
