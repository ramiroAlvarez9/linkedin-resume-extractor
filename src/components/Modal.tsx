import { type ReactNode } from 'react';

interface ModalComponentProps {
  id: string;
  title: string;
  children: ReactNode;
}

export default function ModalComponent({ id, title, children }: ModalComponentProps) {
  return (
    <div className="modal micromodal-slide" id={id} aria-hidden="true">
      <div className="modal__overlay" tabIndex={-1} data-micromodal-close>
        <div
          className="modal__container"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
        >
          <header className="modal__header">
            <h2 className="modal__title" id={`${id}-title`}>
              {title}
            </h2>
            <button className="modal__close" aria-label="Close modal" data-micromodal-close></button>
          </header>

          <div className="modal__content" id={`${id}-content`}>
            {children}
          </div>

          <footer className="modal__footer">
            <button className="modal__btn" data-micromodal-close aria-label="Close this dialog window">
              Close
            </button>
          </footer>
        </div>
      </div>
    </div >
  );
}
