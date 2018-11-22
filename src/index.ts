import commander from 'commander'
import { init } from './lib/cmd'

commander
  .version('0.0.1')
  .description('nos-cli');

commander
  // .command('init [preset_conf]')
  // .alias('i')
  .description('-c and -b is required everytime')
  .option("-c, --config <config_path>", "nos config path")
  .option("-b, --bucket <bucket_name>", "nos bucket name")
  .option("-l, --list [path_pattern]>", "show directory")
  .option("-u, --upload <file_path>", "upload file")
  .option("-e, --env <env>", "key `prefixPath` from config file")
  .action(init)
  .on('--help', function() {
    console.log('\n Waiting for you!!!');
  });


commander.parse(process.argv);
