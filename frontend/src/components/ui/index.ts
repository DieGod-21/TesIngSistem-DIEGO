/**
 * Barrel del sistema de diseño (primitivas UI).
 * Importa el CSS una sola vez aquí para que cualquier consumidor lo reciba.
 *
 *   import { Button, Badge, Card, PageHeader } from '../components/ui';
 */
import './ui.css';

export { default as Button } from './Button';
export type { ButtonProps } from './Button';
export { default as Badge } from './Badge';
export type { BadgeProps, BadgeTone } from './Badge';
export { default as Card } from './Card';
export type { CardProps } from './Card';
export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { default as ListCount } from './ListCount';
export type { ListCountProps } from './ListCount';
export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { default as Field } from './Field';
export type { FieldProps } from './Field';
export { default as Avatar } from './Avatar';
export type { AvatarProps, AvatarSize, AvatarTone } from './Avatar';
export { default as Alert } from './Alert';
export type { AlertProps, AlertTone } from './Alert';
export { default as Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { default as CopyField } from './CopyField';
export type { CopyFieldProps } from './CopyField';
export { default as RelationCard } from './RelationCard';
export type { RelationCardProps } from './RelationCard';
export { default as Picker } from './Picker';
export type { PickerProps } from './Picker';
