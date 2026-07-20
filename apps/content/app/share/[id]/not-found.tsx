import ShareStatusView from './ShareStatusView';
import { LinkIcon } from '@velobits/design-system';

export default function ShareNotFound() {
  return (
    <ShareStatusView
      icon={LinkIcon}
      title="Share not found"
      description="The link may be invalid or the share may have been removed."
    />
  );
}
