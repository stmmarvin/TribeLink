#!/bin/bash

if ! command -v ansible-playbook >/dev/null; then
    echo "The 'ansible-playbook' command was not found. Please install it first."
    exit 1
fi

ansible-playbook -i ansible-hosts --ask-vault-pass ansible-deploy.yml
