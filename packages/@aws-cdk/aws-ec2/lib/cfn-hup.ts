import {Lazy, Aws, CfnResource} from "@aws-cdk/core";
import {AttachInitOptions, InitConfig} from "./cfn-init";
import {InitServiceRestartHandle, InitFile, InitService} from "./cfn-init-elements";
import {InitElementConfig} from "./private/cfn-init-internal";

export class HupConfig extends InitConfig {

    private logicalId: string;
    private configSets: string[];

    constructor() {
        const serviceHandle = new InitServiceRestartHandle();
        const logicalId = Lazy.string({
            produce: () => this.logicalId
        });
        const configSets = Lazy.string({
            produce: () => this.configSets.join(",")
        });

        super([
            InitFile.fromString("/etc/cfn/cfn-hup.conf", [
                "[main]",
                `stack=${Aws.STACK_ID}`,
                `region=${Aws.REGION}`
            ].join("\n"), {serviceRestartHandles: [serviceHandle]}),
            InitFile.fromString("/etc/cfn/hooks.d/cfn-auto-reloader.conf", [
                    "[cfn-auto-reloader-hook]",
                    "triggers=post.update",
                    `path=Resources.${logicalId}.Metadata.AWS::CloudFormation::Init`,
                    `action=/opt/aws/bin/cfn-init -v --region ${Aws.REGION} --stack ${Aws.STACK_NAME} --resource ${logicalId} -c ${configSets}`,
                    "runas=root"
                ].join("\n"), {serviceRestartHandles: [serviceHandle]}
            ),
            InitService.enable("cfn-hup", {enabled: true, ensureRunning: true, serviceRestartHandle: serviceHandle})
        ]);
    }

    public _bind(attachedResource: CfnResource, options: AttachInitOptions): InitElementConfig {
        this.logicalId = attachedResource.logicalId;
        this.configSets = options.configSets ?? ['default'];
        return super._bind(attachedResource, options);
    }
}