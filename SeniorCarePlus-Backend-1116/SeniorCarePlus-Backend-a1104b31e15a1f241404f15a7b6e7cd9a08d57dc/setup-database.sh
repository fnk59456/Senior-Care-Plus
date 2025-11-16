#!/bin/bash

# 此脚本用于设置PostgreSQL数据库
# 请确保已安装PostgreSQL

# 数据库配置
DB_NAME="myapplication_db"
DB_USER="postgres"
DB_PASSWORD="postgres"

# 检查PostgreSQL是否运行
if ! pg_isready > /dev/null 2>&1; then
    echo "错误: PostgreSQL服务未运行"
    echo "请先启动PostgreSQL服务"
    echo "macOS: brew services start postgresql"
    echo "Linux: sudo systemctl start postgresql"
    exit 1
fi

# 检查数据库是否存在
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "数据库 $DB_NAME 已存在"
    read -p "是否删除并重新创建? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ]; then
        dropdb -U $DB_USER $DB_NAME
        echo "已删除数据库 $DB_NAME"
    else
        echo "使用现有数据库 $DB_NAME"
        exit 0
    fi
fi

# 创建数据库
createdb -U $DB_USER $DB_NAME
echo "已创建数据库 $DB_NAME"

# 设置数据库权限
psql -U $DB_USER -d $DB_NAME -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
echo "已设置数据库权限"

echo "数据库设置完成!"
echo "可以通过以下命令连接数据库:"
echo "psql -U $DB_USER -d $DB_NAME" 