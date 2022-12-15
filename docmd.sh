#!/bin/bash

slowecho() {
        local string=$( echo "$@" )
        local string_ptr=0
        local linechars=${#string}

        for (( string_ptr=0 ; string_ptr <= ${linechars} ; string_ptr++ )); do
                echo -n "${string:$string_ptr:1}"
                #sleep `echo "scale=3; 0.15 * (($RANDOM / 32767) ^ 5)" | bc`
                RAND=00$((RANDOM % 80 + 10))
                sleep 0.${RAND: -3}
        done
        sleep 0.3
        echo -en "\n"
}

slowtype() {
        local line
        local IFS_BACKUP=${IFS}
        IFS=$'\n'
        while read line ; do
                slowecho "${line}"
        done
        IFS=${IFS_BACKUP}
}


slowtype << EOF
$1
EOF
$1
