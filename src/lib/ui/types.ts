/**
 * Zentrale UI-Typen für Projekt L
 * Standardisierte Interfaces für Forms und Components
 */

// =============================================
// FORM PROPS
// =============================================

/**
 * Basis-Props für alle Form-Komponenten
 */
export interface BaseFormProps<T> {
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Props für bearbeitbare Forms (mit Delete-Option)
 */
export interface EditableFormProps<T> extends BaseFormProps<T> {
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

// =============================================
// SIZE VARIANTS
// =============================================

export type SizeVariant = 'sm' | 'md' | 'lg' | 'xl';
export type ColorVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

// =============================================
// MODAL PROPS
// =============================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: SizeVariant;
  children: React.ReactNode;
}

// =============================================
// PICKER PROPS
// =============================================

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
  columns?: number;
  size?: SizeVariant;
}

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  size?: SizeVariant;
}

// =============================================
// BUTTON PROPS
// =============================================

export interface ButtonProps {
  variant?: ColorVariant | 'ghost' | 'outline';
  size?: SizeVariant;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  className?: string;
}

// =============================================
// ERROR HANDLING
// =============================================

export interface ErrorAlertProps {
  error: Error | string | null;
  onDismiss?: () => void;
}

export interface FormSubmitResult<T> {
  data?: T;
  error?: Error;
  isSuccess: boolean;
}
