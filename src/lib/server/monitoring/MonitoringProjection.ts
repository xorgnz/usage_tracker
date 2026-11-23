import type { MonitoringResponseViewModel, MonitoringSelection } from '../../monitoring/MonitoringViewModel';

/** Maps runtime snapshots to deliberate browser contracts; does not refresh or calculate usage. */
export interface MonitoringProjection
{
    project(selection: MonitoringSelection): MonitoringResponseViewModel;
}
