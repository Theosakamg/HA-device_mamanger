PRIVATE_KEY_FILE=$SCAN_SCRIPT_PRIVATE_KEY_FILE
SSH_USER=$SCAN_SCRIPT_SSH_USER
SSH_HOST=$SCAN_SCRIPT_SSH_HOST

# Retrieve MAC addresses from Kea DHCP server and output in "ip: mac" format
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ssh -T -i "$DIR/$PRIVATE_KEY_FILE" -o BatchMode=yes -o LogLevel=ERROR -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" 2>/dev/null | awk '{for(i=1;i<=NF;i+=2) print $i": "$(i+1)}'
