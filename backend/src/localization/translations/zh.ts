import { TranslationMap } from '../index';

const translations: TranslationMap = {
  errors: {
    "Name is required": "需要提供名称",
    "Description is required": "需要提供描述",
    "Image is required": "需要提供图像",
    "Invalid parent ID": "父级ID格式无效",
    "Invalid date format": "请提供有效的日期",
    "Invalid account ID": "账户ID格式无效",
    "Invalid from date format": "开始日期格式无效",
    "Invalid to date format": "结束日期格式无效",
    "At least one field must be provided": "您必须更新至少一个字段"
  },
  validations: {
    required: "{{field}}是必需的",
    min_length: "{{field}}必须至少有{{length}}个字符",
    invalid_format: "{{field}}格式无效"
  },
  transactions: {
    created_success: "交易创建成功",
    updated_success: "交易更新成功",
    deleted_success: "交易删除成功",
    not_found: "未找到交易"
  },
  accounts: {
    created_success: "账户创建成功",
    updated_success: "账户更新成功",
    deleted_success: "账户删除成功",
    not_found: "未找到账户"
  },
  categories: {
    created_success: "类别创建成功",
    updated_success: "类别更新成功",
    deleted_success: "类别删除成功",
    not_found: "未找到类别"
  }
};

export default translations; 