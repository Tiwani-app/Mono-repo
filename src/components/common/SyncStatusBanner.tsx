import {DataSyncState} from '../../types/sync';

interface Props {
  state: DataSyncState;
  lastSyncedAt: Date | null;
}

const SyncStatusBanner = (_props: Props) => null;

export default SyncStatusBanner;
