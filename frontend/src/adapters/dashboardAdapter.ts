/**
 * dashboardAdapter.ts
 *
 * Convierte el DashboardSummaryDTO del API externo al modelo interno DashboardSummary.
 * Los datos estáticos (deadlines, resources) también se centralizan aquí temporalmente.
 */

import type { DashboardSummaryDTO } from '../types/dto';
import type { DashboardSummary, KpiData } from '../services/dashboardService';

export function adaptDashboardSummary(dto: DashboardSummaryDTO): DashboardSummary {
  const phaseKpis: KpiData[] = (dto.byPhase ?? []).map((p) => ({
    id:            `kpi-phase-${p.phase_id}`,
    label:         p.phase_description || p.phase_name,
    value:         String(p.count),
    trend:         '',
    trendPositive: true,
    description:   `Estudiantes en ${p.phase_description || p.phase_name}`,
    iconName:      'GraduationCap',
    iconVariant:   'blue' as const,
  }));

  const kpis: KpiData[] = [
    ...phaseKpis,
    {
      id:            'kpi-pending',
      label:         'Sin Aprobar',
      value:         String(dto.pending),
      trend:         '',
      trendPositive: dto.pending === 0,
      description:   'Expedientes pendientes de revisión',
      iconName:      'AlertTriangle',
      iconVariant:   dto.pending > 0 ? 'red' : 'blue',
    },
    {
      id:            'kpi-completion',
      label:         'Completación',
      value:         `${dto.completionPct}%`,
      trend:         '',
      trendPositive: true,
      description:   `${dto.approved} de ${dto.total} aprobados`,
      iconName:      'CheckCircle',
      iconVariant:   'blue',
      progressValue: dto.completionPct,
    },
  ];

  return { kpis, deadlines: [], resources: [] };
}
