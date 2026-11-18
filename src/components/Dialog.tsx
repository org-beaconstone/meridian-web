import { useEffect, useRef, type ReactNode } from 'react';
import Button from '@atlaskit/button/new';

export default function Dialog({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={onClose}
      className={className ? `dialog ${className}` : 'dialog'}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <Button appearance="subtle" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}
