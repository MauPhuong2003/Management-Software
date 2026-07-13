import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingService } from '../services/shippingService';
import { useForm, useFieldArray } from 'react-hook-form';
import { Truck, Save, Plus, Trash2 } from 'lucide-react';

const Shipping = () => {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['shipping'], queryFn: shippingService.getShippingConfig });
  
  const { register, control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      mode: 'fixed',
      fixedFee: 30000,
      provinceFees: [] as { province: string, fee: number }[],
      status: 'active'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'provinceFees'
  });

  const mode = watch('mode');

  useEffect(() => {
    if (data?.data) reset(data.data);
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: shippingService.updateShippingConfig,
    onSuccess: () => {
      alert('Đã lưu cấu hình vận chuyển!');
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    }
  });

  if (isLoading) return <div className="p-6 text-center text-gray-500">Đang tải cấu hình...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Truck className="text-primary" /> Cấu hình Vận chuyển
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cài đặt phí ship mặc định cho toàn hệ thống</p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Phương thức tính phí</label>
              <select {...register('mode')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="fixed">Đồng giá toàn quốc</option>
                <option value="by_province">Theo tỉnh thành (Tuỳ chỉnh)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Trạng thái áp dụng</label>
              <select {...register('status')} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="active">Đang Bật</option>
                <option value="inactive">Đã Tắt (Miễn phí ship toàn quốc)</option>
              </select>
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            {mode === 'fixed' ? (
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Phí ship đồng giá (VNĐ)</label>
                <input type="number" {...register('fixedFee')} className="w-full md:w-1/2 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium dark:text-gray-300">Bảng giá theo tỉnh/thành</label>
                  {hasPermission('settings', 'update') && (
                    <button type="button" onClick={() => append({ province: '', fee: 0 })} className="text-sm bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors cursor-pointer">
                      <Plus size={16} /> Thêm tỉnh
                    </button>
                  )}
                </div>
                {fields.length === 0 ? <p className="text-sm text-gray-500">Chưa có cài đặt nào. Bấm thêm tỉnh để thiết lập.</p> : null}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-center">
                    <input {...register(`provinceFees.${index}.province` as const)} placeholder="Tên tỉnh (vd: Hà Nội)" className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white" required disabled={!hasPermission('settings', 'update')} />
                    <input type="number" {...register(`provinceFees.${index}.fee` as const)} placeholder="Phí ship" className="w-48 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white font-bold text-primary" required disabled={!hasPermission('settings', 'update')} />
                    {hasPermission('settings', 'update') && (
                      <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer"><Trash2 size={20}/></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasPermission('settings', 'update') && (
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={mutation.isPending} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer">
                <Save size={20} /> {mutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt vận chuyển'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
export default Shipping;
