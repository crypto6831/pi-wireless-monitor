# AWS ECS Deployment Guide for Pi Wireless Monitor

## Overview
Amazon ECS provides managed container orchestration. This guide shows how to deploy your Pi Wireless Monitor using ECS with Fargate (serverless containers).

## Prerequisites
- AWS CLI configured
- Docker images pushed to ECR
- VPC with subnets (can use default)

## Step 1: Create ECR Repositories

```bash
# Create repositories for your services
aws ecr create-repository --repository-name pi-monitor/server
aws ecr create-repository --repository-name pi-monitor/dashboard

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

## Step 2: Build and Push Images

```bash
# Build and tag images
docker build -t pi-monitor/server ./server
docker build -t pi-monitor/dashboard ./dashboard

# Tag for ECR
docker tag pi-monitor/server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/server:latest
docker tag pi-monitor/dashboard:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/dashboard:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/dashboard:latest
```

## Step 3: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name pi-monitor-cluster
```

## Step 4: Create Task Definitions

### Server Task Definition (server-task.json):
```json
{
  "family": "pi-monitor-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/server:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"},
        {"name": "MONGODB_URI", "value": "mongodb://your-mongodb-connection"},
        {"name": "REDIS_URL", "value": "redis://your-redis-connection"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pi-monitor-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Dashboard Task Definition (dashboard-task.json):
```json
{
  "family": "pi-monitor-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "dashboard",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/pi-monitor/dashboard:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "REACT_APP_API_URL", "value": "https://your-api-domain.com"},
        {"name": "REACT_APP_SOCKET_URL", "value": "https://your-api-domain.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pi-monitor-dashboard",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Step 5: Register Task Definitions

```bash
aws ecs register-task-definition --cli-input-json file://server-task.json
aws ecs register-task-definition --cli-input-json file://dashboard-task.json
```

## Step 6: Create Services

```bash
# Create server service
aws ecs create-service \
  --cluster pi-monitor-cluster \
  --service-name pi-monitor-server-service \
  --task-definition pi-monitor-server \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# Create dashboard service
aws ecs create-service \
  --cluster pi-monitor-cluster \
  --service-name pi-monitor-dashboard-service \
  --task-definition pi-monitor-dashboard \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Step 7: Set Up Load Balancer

### Create Application Load Balancer
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name pi-monitor-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target groups
aws elbv2 create-target-group \
  --name pi-monitor-server-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --target-type ip

aws elbv2 create-target-group \
  --name pi-monitor-dashboard-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip
```

## Database Options

### Option A: Amazon DocumentDB (MongoDB-compatible)
```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier pi-monitor-docdb \
  --engine docdb \
  --master-username admin \
  --master-user-password your-secure-password
```

### Option B: Amazon ElastiCache (Redis)
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id pi-monitor-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

## Costs (Monthly Estimates)

### Fargate:
- **Server**: ~$15-25/month (512 CPU, 1GB RAM)
- **Dashboard**: ~$8-15/month (256 CPU, 512MB RAM)

### Database:
- **DocumentDB**: ~$50-100/month (t3.medium)
- **ElastiCache**: ~$15-30/month (t3.micro)

### Load Balancer: ~$20/month

**Total**: ~$100-200/month depending on usage

## Pros and Cons

### Pros:
- ✅ Fully managed
- ✅ Auto-scaling
- ✅ High availability
- ✅ No server management

### Cons:
- ❌ More expensive than EC2
- ❌ More complex setup
- ❌ Learning curve 