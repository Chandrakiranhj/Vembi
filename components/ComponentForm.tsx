import { useState, useEffect } from 'react';

interface Component {
  id?: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  currentQuantity: number;
  minimumQuantity: number;
}

interface ComponentFormProps {
  initialData?: Partial<Component>;
  onSubmit: (data: Partial<Component>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Common component categories
const COMPONENT_CATEGORIES = [
  'Resistors',
  'Capacitors',
  'Diodes',
  'Transistors',
  'ICs',
  'Connectors',
  'Switches',
  'LEDs',
  'Displays',
  'PCBs',
  'Power Supplies',
  'Sensors',
  'Miscellaneous'
];

export default function ComponentForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting
}: ComponentFormProps) {
  const [formData, setFormData] = useState<Partial<Component>>({
    name: '',
    sku: '',
    description: '',
    category: '',
    currentQuantity: 0,
    minimumQuantity: 10,
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when initialData changes
  useEffect(() => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      currentQuantity: 0,
      minimumQuantity: 10,
      ...initialData
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Handle numeric inputs
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : Number(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.sku?.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.currentQuantity === undefined || formData.currentQuantity < 0) {
      newErrors.currentQuantity = 'Current quantity must be a non-negative number';
    }

    if (formData.minimumQuantity === undefined || formData.minimumQuantity < 0) {
      newErrors.minimumQuantity = 'Minimum quantity must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Component Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.name ? 'border-red-300' : ''
              }`}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
            SKU / Part Number *
          </label>
          <input
            type="text"
            id="sku"
            name="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.sku ? 'border-red-300' : ''
              }`}
            disabled={isSubmitting}
          />
          {errors.sku && (
            <p className="mt-1 text-sm text-red-600">{errors.sku}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.category ? 'border-red-300' : ''
              }`}
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {COMPONENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Current Quantity */}
        <div>
          <label htmlFor="currentQuantity" className="block text-sm font-medium text-gray-700">
            Current Quantity *
          </label>
          <input
            type="number"
            id="currentQuantity"
            name="currentQuantity"
            value={formData.currentQuantity === undefined ? '' : formData.currentQuantity}
            onChange={handleChange}
            min="0"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.currentQuantity ? 'border-red-300' : ''
              }`}
            disabled={isSubmitting}
          />
          {errors.currentQuantity && (
            <p className="mt-1 text-sm text-red-600">{errors.currentQuantity}</p>
          )}
        </div>

        {/* Minimum Quantity */}
        <div>
          <label htmlFor="minimumQuantity" className="block text-sm font-medium text-gray-700">
            Minimum Quantity *
          </label>
          <input
            type="number"
            id="minimumQuantity"
            name="minimumQuantity"
            value={formData.minimumQuantity === undefined ? '' : formData.minimumQuantity}
            onChange={handleChange}
            min="0"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.minimumQuantity ? 'border-red-300' : ''
              }`}
            disabled={isSubmitting}
          />
          {errors.minimumQuantity && (
            <p className="mt-1 text-sm text-red-600">{errors.minimumQuantity}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description || ''}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialData.id ? 'Update Component' : 'Add Component'}
        </button>
      </div>
    </form>
  );
}