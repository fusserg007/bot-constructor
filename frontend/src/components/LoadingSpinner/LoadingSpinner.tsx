import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  overlay?: boolean; // показывать как оверлей поверх контента
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const spinnerContent = (
    <div className={`${styles.spinnerContainer} ${styles[size]} ${className}`}>
      <div className={`${styles.spinner} ${styles[color]}`}>
        <div className={styles.spinnerInner}></div>
      </div>
      {text && <div className={styles.spinnerText}>{text}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className={styles.overlay}>
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;

// Компонент для inline загрузки (например, в кнопках)
export const InlineSpinner: React.FC<{ size?: 'small' | 'medium' }> = ({ 
  size = 'small' 
}) => {
  return (
    <div className={`${styles.inlineSpinner} ${styles[size]}`}>
      <div className={styles.spinner}>
        <div className={styles.spinnerInner}></div>
      </div>
    </div>
  );
};

// Хук для управления состоянием загрузки
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading(prev => !prev), []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading
  };
};