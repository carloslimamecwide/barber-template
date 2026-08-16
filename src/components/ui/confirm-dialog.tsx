"use client";

import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  variant?: "danger" | "gold";
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  cancelText = "Cancelar",
  confirmText = "Confirmar",
  variant = "gold",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        {description && <p className="text-sm text-muted">{description}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={variant === "danger" ? "btn-danger" : "btn-gold"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
