#!/bin/bash

# Copy web files to S3 bucket
aws s3 sync /home/ec2-user/461Project-Phase2/web/ s3://frontend-461phase2/

# update dependencies
#npm install