#!/bin/bash

# Deploy script for ECS
# This script builds, tags, and pushes a Docker image to ECR, then updates the ECS service

set -e  # Exit on any error

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="904106077871"
ECR_REPOSITORY="fiap-lumiere-video-processor"
ECS_CLUSTER="fiap-lumiere-cluster"
ECS_SERVICE="fiap-lumiere-api-service"
TASK_DEFINITION_FAMILY="fiap-lumiere-video-processor-api"
CONTAINER_NAME="fiap-lumiere-api-container"
TASK_DEFINITION_FILE="$PROJECT_ROOT/task-definition/lumiere-video-processor.json"
TASK_DEFINITION_FAMILY="${TASK_DEFINITION_FAMILY:-fiap-lumiere-video-processor-api}"

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS] [IMAGE_TAG]"
    echo ""
    echo "Deploy the FIAP Lumiere Video Processor API to AWS ECS"
    echo ""
    echo "Options:"
    echo "  --tag TAG           Docker image tag to use (default: latest)"
    echo "  --stages STAGES     Comma-separated list of stages to run"
    echo "                      Available stages: build,push,task-def,deploy"
    echo "                      (default: all stages)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Stages:"
    echo "  build               Build Docker image"
    echo "  push                Push image to ECR"
    echo "  task-def            Update task definition"
    echo "  deploy              Update ECS service"
    echo ""
    echo "Examples:"
    echo "  $0                              # Run all stages with 'latest' tag"
    echo "  $0 --tag v1.2.3                # Run all stages with 'v1.2.3' tag"
    echo "  $0 --stages build,push          # Only build and push"
    echo "  $0 --stages deploy --tag v1.2.3 # Only deploy with specific tag"
    echo "  $0 v1.2.3                      # Backward compatibility: run all with tag"
    echo ""
    echo "Configuration:"
    echo "  AWS_REGION:           ${AWS_REGION}"
    echo "  ECR_REPOSITORY:       ${ECR_REPOSITORY}"
    echo "  ECS_CLUSTER:          ${ECS_CLUSTER}"
    echo "  ECS_SERVICE:          ${ECS_SERVICE}"
    echo ""
    exit 1
}

# Parse command line arguments
IMAGE_TAG="latest"
STAGES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --stages)
            STAGES="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            # If no flags, treat as image tag for backward compatibility
            if [[ -z "$STAGES" && "$1" != --* ]]; then
                IMAGE_TAG="$1"
            fi
            shift
            ;;
    esac
done

# Default to all stages if none specified
if [[ -z "$STAGES" ]]; then
    STAGES="build,push,task-def,deploy"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Show help if requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# Stage checking functions
should_run_stage() {
    local stage=$1
    [[ ",$STAGES," =~ ",$stage," ]]
}

# Stage status tracking
STAGES_RUN=""
mark_stage_complete() {
    local stage=$1
    if [[ -z "$STAGES_RUN" ]]; then
        STAGES_RUN="$stage"
    else
        STAGES_RUN="$STAGES_RUN,$stage"
    fi
    log_success "Stage '$stage' completed"
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker."
    exit 1
fi

log_info "Starting deployment process..."
log_info "Stages to run: $STAGES"
log_info "Image tag: $IMAGE_TAG"

# Change to project root directory
cd "$PROJECT_ROOT"
log_info "Working from directory: $(pwd)"

# Get the full ECR repository URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
FULL_IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

# ===============================
# STAGE: BUILD
# ===============================
if should_run_stage "build"; then
    log_info "=== STAGE: BUILD ==="
    
    log_info "Building Docker image..."
    docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .
    
    log_success "Docker image built successfully"
    mark_stage_complete "build"
else
    log_info "Skipping build stage"
fi

# ===============================
# STAGE: PUSH
# ===============================
if should_run_stage "push"; then
    log_info "=== STAGE: PUSH ==="
    
    # Tag the image for ECR
    log_info "Tagging image for ECR..."
    docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${FULL_IMAGE_URI}
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Create ECR repository if it doesn't exist
    log_info "Checking if ECR repository exists..."
    if ! aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} &> /dev/null; then
        log_warning "ECR repository does not exist. Creating..."
        aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
        log_success "ECR repository created"
    else
        log_info "ECR repository already exists"
    fi
    
    # Push the image to ECR
    log_info "Pushing image to ECR..."
    docker push ${FULL_IMAGE_URI}
    log_success "Image pushed to ECR successfully"
    
    # Clear docker credentials
    docker logout 2>/dev/null || true
    
    mark_stage_complete "push"
else
    log_info "Skipping push stage"
fi

# ===============================
# STAGE: TASK-DEF
# ===============================
if should_run_stage "task-def"; then
    log_info "=== STAGE: TASK-DEF ==="
    
    log_info "Updating task definition..."
    
    # Check if task definition file exists
    if [ ! -f "${TASK_DEFINITION_FILE}" ]; then
        log_error "Task definition file not found: ${TASK_DEFINITION_FILE}"
        exit 1
    fi

    # Validate that the container name in the task definition matches our expected name
    TASK_CONTAINER_NAME=$(jq -r '.containerDefinitions[0].name' "${TASK_DEFINITION_FILE}")
    if [ "$TASK_CONTAINER_NAME" != "$CONTAINER_NAME" ]; then
        log_error "Container name mismatch. Expected: $CONTAINER_NAME, Found: $TASK_CONTAINER_NAME"
        exit 1
    fi
    
    # Read the task definition file and update the image URI
    NEW_TASK_DEF=$(jq --arg IMAGE_URI "${FULL_IMAGE_URI}" \
                      --arg LOG_LEVEL "debug" \
                      --arg AWS_REGION "$AWS_REGION" \
                      '.containerDefinitions[0].image = $IMAGE_URI | 
                       .containerDefinitions[0].environment += [
                         {"name": "LOG_LEVEL", "value": $LOG_LEVEL},
                         {"name": "AWS_REGION", "value": $AWS_REGION}
                       ] | 
                       .containerDefinitions[0].environment |= unique_by(.name)' \
                      "${TASK_DEFINITION_FILE}")
    
    # Validate the generated JSON
    if ! echo "$NEW_TASK_DEF" | jq . > /dev/null 2>&1; then
        log_error "Generated task definition is not valid JSON"
        exit 1
    fi
    
    log_info "Task definition JSON generated successfully"
    
    # Register the new task definition
    log_info "Registering new task definition..."
    REGISTER_RESULT=$(aws ecs register-task-definition --family ${TASK_DEFINITION_FAMILY} --region ${AWS_REGION} --cli-input-json "$NEW_TASK_DEF")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to register task definition"
        echo "$REGISTER_RESULT"
        exit 1
    fi

    log_info "Task definition registration result:"
    log_info $($REGISTER_RESULT | jq)
    
    TASK_DEF_ARN=$(echo "$REGISTER_RESULT" | jq -r '.taskDefinition.taskDefinitionArn')
    
    if [ -z "$TASK_DEF_ARN" ] || [ "$TASK_DEF_ARN" = "null" ]; then
        log_error "Failed to extract task definition ARN from registration result:"
        echo "$REGISTER_RESULT"
        exit 1
    fi
    
    log_success "New task definition registered: ${TASK_DEF_ARN}"
    mark_stage_complete "task-def"
else
    log_info "Skipping task-def stage"
    # If we're running deploy stage without task-def, we need to get the latest task definition
    if should_run_stage "deploy"; then
        log_info "Getting latest task definition for deployment..."
        TASK_DEF_ARN=$(aws ecs describe-task-definition \
            --task-definition ${TASK_DEFINITION_FAMILY} \
            --region ${AWS_REGION} \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
        
        if [ -z "$TASK_DEF_ARN" ] || [ "$TASK_DEF_ARN" = "null" ]; then
            log_error "Could not find existing task definition for family: ${TASK_DEFINITION_FAMILY}"
            exit 1
        fi
        
        log_info "Using existing task definition: ${TASK_DEF_ARN}"
    fi
fi

# ===============================
# STAGE: DEPLOY
# ===============================
if should_run_stage "deploy"; then
    log_info "=== STAGE: DEPLOY ==="
    
    # Check if ECS cluster exists
    log_info "Checking if ECS cluster exists..."
    if ! aws ecs describe-clusters --clusters ${ECS_CLUSTER} --region ${AWS_REGION} | jq -e '.clusters[] | select(.status == "ACTIVE")' &> /dev/null; then
        log_warning "ECS cluster ${ECS_CLUSTER} does not exist or is not active."
        log_info "Please create the ECS cluster first or check the cluster name."
        exit 1
    fi
    
    # Check if ECS service exists
    log_info "Checking if ECS service exists..."
    if aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} | jq -e '.services[] | select(.status == "ACTIVE")' &> /dev/null; then
        # Verify task definition ARN before updating
        if [ -z "$TASK_DEF_ARN" ] || [ "$TASK_DEF_ARN" = "null" ]; then
            log_error "Task definition ARN is empty or invalid. Cannot update service."
            exit 1
        fi
        
        # Update existing service
        log_info "Updating ECS service with task definition: ${TASK_DEF_ARN}"
        aws ecs update-service \
            --cluster ${ECS_CLUSTER} \
            --service ${ECS_SERVICE} \
            --task-definition ${TASK_DEF_ARN} \
            --region ${AWS_REGION} \
            --force-new-deployment > /dev/null
        
        log_success "ECS service updated successfully"
        
        # Wait for deployment to complete
        log_info "Waiting for deployment to complete..."
        aws ecs wait services-stable \
            --cluster ${ECS_CLUSTER} \
            --services ${ECS_SERVICE} \
            --region ${AWS_REGION}
        
        log_success "Deployment completed successfully!"
    else
        log_warning "ECS service ${ECS_SERVICE} does not exist."
        log_info "Please create the ECS service first or use the create-service script."
    fi
    
    # Get service status
    log_info "Getting service status..."
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION} \
        --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' \
        --output table)
    
    echo "${SERVICE_STATUS}"
    
    mark_stage_complete "deploy"
else
    log_info "Skipping deploy stage"
fi

# ===============================
# DEPLOYMENT SUMMARY
# ===============================
log_success "Deployment script completed successfully!"
log_info "Stages completed: $STAGES_RUN"
log_info "ECR Repository: ${ECR_REPOSITORY}"
log_info "Image URI: ${FULL_IMAGE_URI}"
if [[ -n "$TASK_DEF_ARN" ]]; then
    log_info "Task Definition ARN: ${TASK_DEF_ARN}"
fi
log_info "ECS Cluster: ${ECS_CLUSTER}"
log_info "ECS Service: ${ECS_SERVICE}"
