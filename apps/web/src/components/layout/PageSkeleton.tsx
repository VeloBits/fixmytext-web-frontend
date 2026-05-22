import '../../assets/css/PageSkeleton.css';

/**
 * PageSkeleton — lightweight shimmer placeholder shown while lazy routes load.
 */
export default function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="page-skeleton__bar page-skeleton__bar--title" />
      <div className="page-skeleton__bar page-skeleton__bar--subtitle" />
      <div className="page-skeleton__spacer" />
      <div className="page-skeleton__bar page-skeleton__bar--line" />
      <div className="page-skeleton__bar page-skeleton__bar--line page-skeleton__bar--short" />
      <div className="page-skeleton__bar page-skeleton__bar--line" />
      <div className="page-skeleton__spacer" />
      <div className="page-skeleton__bar page-skeleton__bar--line page-skeleton__bar--short" />
      <div className="page-skeleton__bar page-skeleton__bar--line" />
    </div>
  );
}
