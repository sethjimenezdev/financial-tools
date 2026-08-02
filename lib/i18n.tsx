'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'en' | 'es'

interface ColumnLabels {
  balanceNAP: string;
  balanceWAP: string;
  decreaseNAP: string;
  decreaseWAP: string;
  interestNAP: string;
  interestWAP: string;
  remainingBalanceNAP: string;
  remainingBalanceWAP: string;
}

interface Translations {
  appTitle: string;
  appSubtitle: string;
  appDescription: string;
  formIntro: string;
  mortgageAmountLabel: string;
  interestRateLabel: string;
  mortgageLengthLabel: string;
  yearsUnit: string;
  numberOfPaymentsLabel: string;
  monthlyPaymentLabel: string;
  monthlyAdditionalPaymentLabel: string;
  fullInterestPaymentNAPLabel: string;
  fullInterestPaymentWAPLabel: string;
  fullInterestSavingsLabel: string;
  clearAdditionalPaymentAria: string;
  jumpToPayoffRowAria: string;
  backToTopAria: string;
  selectColumnsLabel: string;
  downloadPdfLabel: string;
  generatedOnLabel: string;
  feedbackButtonLabel: string;
  feedbackModalTitle: string;
  feedbackNameLabel: string;
  feedbackEmailLabel: string;
  feedbackTypeLabel: string;
  feedbackTypeBug: string;
  feedbackTypeImprovement: string;
  feedbackTypeOther: string;
  feedbackCommentLabel: string;
  feedbackSubmitLabel: string;
  feedbackSubmittingLabel: string;
  feedbackSuccessMessage: string;
  feedbackErrorMessage: string;
  feedbackErrorName: string;
  feedbackErrorEmail: string;
  feedbackErrorComment: string;
  feedbackCloseAria: string;
  columns: ColumnLabels & {
    paymentNumber: string;
    letraHipotecaria: string;
    pagoAdicional: string;
  };
  columnsMobile: ColumnLabels;
}

const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Mortgage Calculator',
    appSubtitle: 'Powered by D4B Studio LLC',
    appDescription: 'A payment mortgage calculator, showing amortization details and the impact of additional payments.',
    formIntro: 'Please type in your mortgage data on the form.',
    mortgageAmountLabel: 'Mortgage Amount',
    interestRateLabel: 'Interest Rate',
    mortgageLengthLabel: 'Mortgage Length',
    yearsUnit: 'years',
    numberOfPaymentsLabel: 'Number of Payments',
    monthlyPaymentLabel: 'Monthly Payment',
    monthlyAdditionalPaymentLabel: 'Monthly Additional Payment',
    fullInterestPaymentNAPLabel: 'Full Interest Payment (without additional payments)',
    fullInterestPaymentWAPLabel: 'Full Interest Payment (with additional payments)',
    fullInterestSavingsLabel: 'Full Interest Savings',
    clearAdditionalPaymentAria: 'Clear additional payment',
    jumpToPayoffRowAria: 'Jump to the row where the loan is paid off',
    backToTopAria: 'Back to top',
    selectColumnsLabel: 'Select the columns to display:',
    downloadPdfLabel: 'Download PDF',
    generatedOnLabel: 'Generated on',
    feedbackButtonLabel: 'Feedback',
    feedbackModalTitle: 'Send Feedback',
    feedbackNameLabel: 'Name',
    feedbackEmailLabel: 'Email',
    feedbackTypeLabel: 'Type',
    feedbackTypeBug: 'Bug',
    feedbackTypeImprovement: 'Improvement',
    feedbackTypeOther: 'Other',
    feedbackCommentLabel: 'Comment',
    feedbackSubmitLabel: 'Submit',
    feedbackSubmittingLabel: 'Submitting…',
    feedbackSuccessMessage: 'Thanks! Your feedback has been sent.',
    feedbackErrorMessage: 'Something went wrong. Please try again.',
    feedbackErrorName: 'Name must be at least 3 characters.',
    feedbackErrorEmail: 'Please enter a valid email address.',
    feedbackErrorComment: 'Please write a comment that help us to understand you.',
    feedbackCloseAria: 'Close feedback form',
    columns: {
      paymentNumber: 'Payment #',
      letraHipotecaria: 'Mortgage Payment',
      pagoAdicional: 'Additional Payment',
      balanceNAP: 'Balance (No Additional Payments)',
      balanceWAP: 'Balance (With Additional Payments)',
      decreaseNAP: 'Reduction (No Additional Payments)',
      decreaseWAP: 'Reduction (With Additional Payments)',
      interestNAP: 'Interest (No Additional Payments)',
      interestWAP: 'Interest (With Additional Payments)',
      remainingBalanceNAP: 'Remaining Debt (No Additional Payments)',
      remainingBalanceWAP: 'Remaining Debt (With Additional Payments)',
    },
    columnsMobile: {
      balanceNAP: 'Balance (No Extra)',
      balanceWAP: 'Balance (With Extra)',
      decreaseNAP: 'Reduction (No Extra)',
      decreaseWAP: 'Reduction (With Extra)',
      interestNAP: 'Interest (No Extra)',
      interestWAP: 'Interest (With Extra)',
      remainingBalanceNAP: 'Remaining (No Extra)',
      remainingBalanceWAP: 'Remaining (With Extra)',
    },
  },
  es: {
    appTitle: 'Calculadora Hipotecaria',
    appSubtitle: 'Desarrollada por D4B Studio LLC',
    appDescription: 'Una calculadora de pagos hipotecarios, que muestra los detalles de amortización y el impacto de los pagos adicionales.',
    formIntro: 'Por favor ingrese los datos de su hipoteca en el formulario.',
    mortgageAmountLabel: 'Monto de la Hipoteca',
    interestRateLabel: 'Tasa de Interés',
    mortgageLengthLabel: 'Plazo de la Hipoteca',
    yearsUnit: 'años',
    numberOfPaymentsLabel: 'Número de Pagos',
    monthlyPaymentLabel: 'Pago Mensual',
    monthlyAdditionalPaymentLabel: 'Pago Adicional Mensual',
    fullInterestPaymentNAPLabel: 'Interés Total (sin pagos adicionales)',
    fullInterestPaymentWAPLabel: 'Interés Total (con pagos adicionales)',
    fullInterestSavingsLabel: 'Ahorro Total en Intereses',
    clearAdditionalPaymentAria: 'Borrar pago adicional',
    jumpToPayoffRowAria: 'Ir a la fila donde se salda el préstamo',
    backToTopAria: 'Volver arriba',
    selectColumnsLabel: 'Seleccione las columnas a mostrar:',
    downloadPdfLabel: 'Descargar PDF',
    generatedOnLabel: 'Generado el',
    feedbackButtonLabel: 'Comentarios',
    feedbackModalTitle: 'Enviar Comentarios',
    feedbackNameLabel: 'Nombre',
    feedbackEmailLabel: 'Correo Electrónico',
    feedbackTypeLabel: 'Tipo',
    feedbackTypeBug: 'Error',
    feedbackTypeImprovement: 'Mejora',
    feedbackTypeOther: 'Otro',
    feedbackCommentLabel: 'Comentario',
    feedbackSubmitLabel: 'Enviar',
    feedbackSubmittingLabel: 'Enviando…',
    feedbackSuccessMessage: '¡Gracias! Tu comentario ha sido enviado.',
    feedbackErrorMessage: 'Algo salió mal. Por favor intenta de nuevo.',
    feedbackErrorName: 'El nombre debe tener al menos 3 caracteres.',
    feedbackErrorEmail: 'Por favor ingresa un correo electrónico válido.',
    feedbackErrorComment: 'Por favor escribe un comentario que nos ayude a entenderte.',
    feedbackCloseAria: 'Cerrar formulario de comentarios',
    columns: {
      paymentNumber: 'Pago #',
      letraHipotecaria: 'Letra Hipotecaria',
      pagoAdicional: 'Pago Adicional',
      balanceNAP: 'Saldo (Sin Pagos Adicionales)',
      balanceWAP: 'Saldo (Con Pagos Adicionales)',
      decreaseNAP: 'Reduccion (Sin Pagos Adicionales)',
      decreaseWAP: 'Reduccion (Con Pagos Adicionales)',
      interestNAP: 'Intereses (Sin Pagos Adicionales)',
      interestWAP: 'Intereses (Con Pagos Adicionales)',
      remainingBalanceNAP: 'Deuda Restante (Sin Pagos Adicionales)',
      remainingBalanceWAP: 'Deuda Restante (Con Pagos Adicionales)',
    },
    columnsMobile: {
      balanceNAP: 'Saldo (Sin)',
      balanceWAP: 'Saldo (Con)',
      decreaseNAP: 'Reducción (Sin)',
      decreaseWAP: 'Reducción (Con)',
      interestNAP: 'Intereses (Sin)',
      interestWAP: 'Intereses (Con)',
      remainingBalanceNAP: 'Restante (Sin)',
      remainingBalanceWAP: 'Restante (Con)',
    },
  },
};

const STORAGE_KEY = 'language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') setLanguageState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
