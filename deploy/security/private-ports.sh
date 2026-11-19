#!/bin/sh
# OPS-20. Restrict Internet ingress to private published services, before Docker accepts it.
# SSH, HTTP/S, VPN and MTProto are deliberately outside this port list.
set -eu
for firewall in iptables ip6tables; do
    "$firewall" -w 5 -nL DOCKER-USER >/dev/null 2>&1 || "$firewall" -w 5 -N DOCKER-USER
    for port in 3000 3001 3002 5432 6379 8080 18000; do
        if ! "$firewall" -w 5 -C DOCKER-USER -i ens3 -p tcp -m conntrack --ctdir ORIGINAL --ctorigdstport "$port" -m comment --comment 'OPS20 private service' -j DROP 2>/dev/null; then
            "$firewall" -w 5 -I DOCKER-USER 1 -i ens3 -p tcp -m conntrack --ctdir ORIGINAL --ctorigdstport "$port" -m comment --comment 'OPS20 private service' -j DROP
        fi
    done
done
