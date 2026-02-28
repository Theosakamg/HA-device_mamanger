# Retrieve MAC addresses from Kea DHCP server and output in "ip: mac" format
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ssh -T -i "$DIR/pfsense_kea" -o BatchMode=yes -o LogLevel=ERROR root@192.168.0.254 | jq -r '.arguments.leases[] | "\(."ip-address"): \(."hw-address")"' 2>/dev/null
