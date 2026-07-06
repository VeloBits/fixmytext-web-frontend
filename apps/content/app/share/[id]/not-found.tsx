import ShareStatusView from './ShareStatusView';

export default function ShareNotFound() {
  return (
    <ShareStatusView
      emoji="🔗"
      title="Share not found"
      description="The link may be invalid or the share may have been removed."
    />
  );
}
