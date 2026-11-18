import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { useProviderStore } from '../../stores/providerStore';
import { useUIStore } from '../../stores/uiStore';
import { Link2 } from 'lucide-react';

export const AddSourceModal: React.FC = () => {
  const { activeModal, closeModal, showToast } = useUIStore();
  const addSource = useProviderStore((state) => state.addSource);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = activeModal === 'addSource';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Source URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await addSource(name || 'Custom Source', url);
      showToast('Provider source added successfully', 'success');
      setName('');
      setUrl('');
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Add Provider Source"
      navSection="add-source-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-vega-textSecondary mb-2">
            Source Name
          </label>
          <input
            type="text"
            data-focusable="true"
            data-nav-section="add-source-modal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Vega Providers"
            className="w-full bg-vega-surface2 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-white/30 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-vega-textSecondary mb-2">
            Source Base URL (GitHub Raw)
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vega-textSecondary" />
            <input
              type="url"
              required
              data-focusable="true"
              data-nav-section="add-source-modal"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/user/repo/main"
              className="w-full bg-vega-surface2 text-white pl-10 pr-4 py-3 rounded-2xl border border-white/10 focus:border-white/30 text-sm"
            />
          </div>
          <p className="text-xs text-vega-textSecondary mt-1.5">
            Should contain manifest.json and dist/ directory at root.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-vega-error/20 border border-vega-error text-vega-error text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            navSection="add-source-modal"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            navSection="add-source-modal"
          >
            Add Source
          </Button>
        </div>
      </form>
    </Modal>
  );
};
