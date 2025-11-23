import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const getVariantColors = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: 'text-red-500 bg-red-100 dark:bg-red-900/30',
                    button: 'bg-red-500 hover:bg-red-600 text-white'
                };
            case 'warning':
                return {
                    icon: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                    button: 'bg-yellow-500 hover:bg-yellow-600 text-white'
                };
            default:
                return {
                    icon: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                    button: 'bg-blue-500 hover:bg-blue-600 text-white'
                };
        }
    };

    const colors = getVariantColors();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full ${colors.icon}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                                    <p className="text-[var(--color-text-muted)]">{message}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 mt-8 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`px-4 py-2 rounded-lg font-bold transition-colors ${colors.button}`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
