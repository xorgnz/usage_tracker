import type { MonitoringResponseViewModel, MonitoringSelection } from '../../monitoring/MonitoringViewModel';
import type { MonitoringSnapshot } from './MonitoringSnapshot';

/** Maps runtime snapshots to deliberate browser contracts; does not refresh or calculate usage. */
export interface MonitoringProjection
{
    project(snapshot: MonitoringSnapshot, selection: MonitoringSelection): MonitoringResponseViewModel;
}
